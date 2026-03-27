import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { qcReviewsTable, tasksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks/:taskId/qc", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);

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

router.post("/tasks/:taskId/qc", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { decision, comments, reviewerId = 2 } = req.body;

    if (!decision || !["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
    }

    if (decision === "rejected" && (!comments || comments.trim() === "")) {
      return res.status(400).json({ error: "Comments are required when rejecting a task" });
    }

    // Verify task exists and is in a reviewable state
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const [review] = await db
      .insert(qcReviewsTable)
      .values({ taskId, reviewerId, decision, comments: comments || null })
      .returning();

    // Update task status based on decision
    const newStatus = decision === "approved" ? "approved" : "assigned";
    await db
      .update(tasksTable)
      .set({
        status: newStatus,
        completedAt: decision === "approved" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasksTable.id, taskId));

    // Get reviewer name
    const [reviewer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, reviewerId));

    res.status(201).json({
      id: review.id,
      taskId: review.taskId,
      reviewerId: review.reviewerId,
      reviewerName: reviewer?.name ?? "Reviewer",
      decision: review.decision,
      comments: review.comments,
      createdAt: review.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to submit QC review");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
