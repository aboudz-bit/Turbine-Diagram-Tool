import { useAuth } from "./useAuth";

export type AppRole = "engineer" | "supervisor" | "site_manager" | "technician" | "admin";

const QC_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const TASK_CREATE_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const ANALYTICS_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const CHECKLIST_CREATE_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const QR_GENERATE_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const AUDIT_VIEW_ROLES: AppRole[] = ["engineer", "supervisor", "site_manager", "admin"];
const ADMIN_ROLES: AppRole[] = ["admin"];

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role ?? "technician") as AppRole;

  return {
    role,
    // Task operations
    canCreateTask: TASK_CREATE_ROLES.includes(role),
    canDeleteTask: role === "site_manager" || role === "admin",
    // QC operations
    canApproveQc: QC_ROLES.includes(role),
    canRejectQc: QC_ROLES.includes(role),
    // Work operations
    canStartWork: true,
    canSubmit: true,
    // View permissions
    canViewAllTasks: role !== "technician",
    canViewAnalytics: ANALYTICS_ROLES.includes(role),
    canViewAuditLog: AUDIT_VIEW_ROLES.includes(role),
    // Checklist operations
    canCreateChecklist: CHECKLIST_CREATE_ROLES.includes(role),
    canFillChecklist: true, // all roles
    // Signature operations
    canSignAsTechnician: true, // all roles
    canSignAsSupervisor: QC_ROLES.includes(role),
    // QR operations
    canGenerateQr: QR_GENERATE_ROLES.includes(role),
    // Attachment operations
    canUploadAttachment: true,
    canDeleteAnyAttachment: role === "supervisor" || role === "site_manager" || role === "admin",
    // Admin operations
    canManageUsers: ADMIN_ROLES.includes(role),
    canConfigureSystem: ADMIN_ROLES.includes(role),
    // Role checks
    isQcRole: QC_ROLES.includes(role),
    isTechnician: role === "technician",
    isSiteManager: role === "site_manager",
    isAdmin: role === "admin",
  };
}
