/**
 * Task status state machine.
 * Defines which transitions are valid from each status.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["assigned"],
  assigned: ["in_progress", "draft"],
  in_progress: ["paused", "submitted"],
  paused: ["in_progress"],
  submitted: ["under_qc"],
  under_qc: ["approved", "rejected"],
  approved: [], // terminal
  rejected: ["in_progress"],
  overdue: ["in_progress"],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: string): string[] {
  return VALID_TRANSITIONS[from] ?? [];
}
