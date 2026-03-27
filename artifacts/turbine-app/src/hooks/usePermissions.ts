import { useAuth } from "./useAuth";

export type AppRole = "engineer" | "supervisor" | "site_manager" | "technician";

const QC_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager"];
const TASK_CREATE_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager"];

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role ?? "technician") as AppRole;

  return {
    role,
    canCreateTask: TASK_CREATE_ROLES.includes(role),
    canApproveQc: QC_ROLES.includes(role),
    canRejectQc: QC_ROLES.includes(role),
    canStartWork: true,
    canSubmit: true,
    canViewAllTasks: role !== "technician",
    isQcRole: QC_ROLES.includes(role),
    isTechnician: role === "technician",
    isSiteManager: role === "site_manager",
  };
}
