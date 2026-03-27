import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export type NotificationType =
  | "task_assigned"
  | "task_submitted"
  | "task_rejected"
  | "task_revision_needed"
  | "task_approved"
  | "task_overdue";

type UserRoleValue = "engineer" | "supervisor" | "site_manager" | "technician";

export async function createNotification(
  userId: number,
  taskId: number | null,
  type: NotificationType,
  title: string,
  message: string,
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId,
      taskId,
      type,
      title,
      message,
    });
  } catch {
    // Notifications are non-critical — never throw
  }
}

export async function notifyRoles(
  roles: string[],
  taskId: number | null,
  type: NotificationType,
  title: string,
  message: string,
  excludeUserId?: number,
): Promise<void> {
  try {
    const validRoles = roles.filter((r): r is UserRoleValue =>
      ["engineer", "supervisor", "site_manager", "technician"].includes(r),
    );

    if (validRoles.length === 0) return;

    const users = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.role, validRoles));

    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) continue;
      await createNotification(user.id, taskId, type, title, message);
    }
  } catch {
    // Notifications are non-critical — never throw
  }
}
