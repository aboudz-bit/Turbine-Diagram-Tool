/**
 * Computes the effective status of a task, overriding to "overdue"
 * if the task has a deadline in the past and is not in a terminal state.
 */
export function computeEffectiveStatus(task: {
  status: string;
  deadline: Date | null;
}): string {
  if (
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    !["approved", "rejected", "revision_needed", "submitted", "under_qc"].includes(task.status)
  ) {
    return "overdue";
  }
  return task.status;
}
