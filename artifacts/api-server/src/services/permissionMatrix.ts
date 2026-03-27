/**
 * Enterprise RBAC Permission Matrix
 *
 * Central permission guard for all operations.
 * Roles: technician, supervisor, engineer, site_manager, admin
 *
 * Each permission maps to a set of allowed roles.
 */

export type Role = "technician" | "supervisor" | "engineer" | "site_manager" | "admin";

export type Permission =
  // Task operations
  | "task:create"
  | "task:assign"
  | "task:start"
  | "task:pause"
  | "task:resume"
  | "task:submit"
  | "task:delete"
  // QC operations
  | "qc:review"
  | "qc:approve"
  | "qc:reject"
  // Checklist operations
  | "checklist:create"
  | "checklist:fill"
  | "checklist:view"
  // Signature operations
  | "signature:technician"
  | "signature:supervisor"
  // Attachment operations
  | "attachment:upload"
  | "attachment:delete_own"
  | "attachment:delete_any"
  // Notification operations
  | "notification:view"
  | "notification:manage"
  // Audit operations
  | "audit:view"
  | "audit:export"
  | "audit:delete" // highly restricted
  // Dashboard operations
  | "dashboard:view"
  | "dashboard:analytics"
  // Asset / QR operations
  | "asset:view"
  | "asset:manage"
  | "qr:generate"
  // Admin operations
  | "user:manage"
  | "system:configure";

/**
 * Permission matrix: permission → allowed roles
 */
const PERMISSION_MATRIX: Record<Permission, Role[]> = {
  // Task operations
  "task:create":    ["engineer", "supervisor", "site_manager", "admin"],
  "task:assign":    ["engineer", "supervisor", "site_manager", "admin"],
  "task:start":     ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "task:pause":     ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "task:resume":    ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "task:submit":    ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "task:delete":    ["site_manager", "admin"],

  // QC operations
  "qc:review":     ["engineer", "supervisor", "site_manager", "admin"],
  "qc:approve":    ["engineer", "supervisor", "site_manager", "admin"],
  "qc:reject":     ["engineer", "supervisor", "site_manager", "admin"],

  // Checklist operations
  "checklist:create": ["engineer", "supervisor", "site_manager", "admin"],
  "checklist:fill":   ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "checklist:view":   ["technician", "engineer", "supervisor", "site_manager", "admin"],

  // Signature operations
  "signature:technician":  ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "signature:supervisor":  ["engineer", "supervisor", "site_manager", "admin"],

  // Attachment operations
  "attachment:upload":     ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "attachment:delete_own": ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "attachment:delete_any": ["supervisor", "site_manager", "admin"],

  // Notification operations
  "notification:view":   ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "notification:manage": ["site_manager", "admin"],

  // Audit operations
  "audit:view":    ["engineer", "supervisor", "site_manager", "admin"],
  "audit:export":  ["supervisor", "site_manager", "admin"],
  "audit:delete":  ["admin"], // only admin can delete audit logs

  // Dashboard operations
  "dashboard:view":      ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "dashboard:analytics": ["engineer", "supervisor", "site_manager", "admin"],

  // Asset / QR operations
  "asset:view":    ["technician", "engineer", "supervisor", "site_manager", "admin"],
  "asset:manage":  ["engineer", "site_manager", "admin"],
  "qr:generate":   ["engineer", "supervisor", "site_manager", "admin"],

  // Admin operations
  "user:manage":       ["admin"],
  "system:configure":  ["admin"],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const allowedRoles = PERMISSION_MATRIX[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as Role);
}

/**
 * Get all permissions for a given role.
 */
export function getRolePermissions(role: string): Permission[] {
  return (Object.entries(PERMISSION_MATRIX) as [Permission, Role[]][])
    .filter(([, roles]) => roles.includes(role as Role))
    .map(([perm]) => perm);
}

/**
 * Express middleware factory: check permission instead of role.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userRole = req.user.role as string;
    const allowed = permissions.some((p) => hasPermission(userRole, p));

    if (!allowed) {
      res.status(403).json({
        error: `Access denied. Required permission: ${permissions.join(" or ")}. Your role: ${userRole}`,
      });
      return;
    }

    next();
  };
}

/**
 * Get the full permission matrix (for API exposure / frontend sync).
 */
export function getPermissionMatrix(): Record<Permission, Role[]> {
  return { ...PERMISSION_MATRIX };
}
