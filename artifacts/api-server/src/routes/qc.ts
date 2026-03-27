import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qcReviewsTable, tasksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateBody } from "../middleware/validate";
import { SubmitQcReviewBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks/:taskId/qc", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId as string, 10);

    const reviews = await db
      .select({
        id: qcReviewsTable.id,
        taskId: qcReviewsTable.taskId,
        reviewerId: qcReviewsTable.reviewerId,
        reviewerName: usersTable.name,
        decision: qcReviewsTable.decision,
        comments: qcReviewsTable.comments,
        createdAt: qcReviewsTable.createdAt,
      })
      .from(qcReviewsTable)
      .leftJoin(usersTable, eq(qcReviewsTable.reviewerId, usersTable.id))
      .where(eq(qcReviewsTable.taskId, taskId))
      .orderBy(qcReviewsTable.createdAt);

    res.json(reviews);
  } catch (err) {
    req.log.error({ err }, "Failed to list QC reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/tasks/:taskId/qc",
  validateBody(SubmitQcReviewBody),
  async (req, res): Promise<void> => {
    try {
      const taskId = parseInt(req.params.taskId as string, 10);
      const { decision, comments } = req.body as { decision: string; comments?: string };
      const reviewerId = req.user!.id;

      if (decision === "rejected" && (!comments || comments.trim() === "")) {
        res
          .status(400)
          .json({ error: "Comments are required when rejecting a task" });
        return;
      }

      // Verify task exists and is in a reviewable state
      const [task] = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, taskId));

      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }

      if (!["submitted", "under_qc"].includes(task.status)) {
        res.status(400).json({
          error: `Cannot review: task is in '${task.status}' status. Must be 'submitted' or 'under_qc'.`,
        });
        return;
      }

      // Wrap in transaction
      const review = await db.transaction(async (tx) => {
        const [newReview] = await tx
          .insert(qcReviewsTable)
          .values({
            taskId,
            reviewerId,
            decision,
            comments: comments || null,
          })
          .returning();

        const newStatus = decision === "approved" ? "approved" as const : "revision_needed" as const;
        const now = new Date();
        await tx
          .update(tasksTable)
          .set({
            status: newStatus,
            completedAt: decision === "approved" ? now : null,
            updatedAt: now,
          })
          .where(eq(tasksTable.id, taskId));

        return newReview;
      });

      res.status(201).json({
        id: review.id,
        taskId: review.taskId,
        reviewerId: review.reviewerId,
        reviewerName: req.user!.name,
        decision: review.decision,
        comments: review.comments,
        createdAt: review.createdAt,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to submit QC review");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
