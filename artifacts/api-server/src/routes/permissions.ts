/**
 * Enterprise RBAC — Permission Routes
 *
 * GET /permissions/matrix        — full permission matrix
 * GET /permissions/me            — current user's permissions
 * GET /permissions/check/:perm   — check if current user has a permission
 */

import { Router, type IRouter } from "express";
import {
  getPermissionMatrix,
  getRolePermissions,
  hasPermission,
  type Permission,
} from "../services/permissionMatrix";

const router: IRouter = Router();

/**
 * Return the full permission matrix (all permissions → roles).
 */
router.get("/permissions/matrix", (req, res) => {
  res.json({ matrix: getPermissionMatrix() });
});

/**
 * Return all permissions for the current user's role.
 */
router.get("/permissions/me", (req, res) => {
  const role = req.user?.role ?? "technician";
  const permissions = getRolePermissions(role);
  res.json({
    role,
    permissions,
    permissionCount: permissions.length,
  });
});

/**
 * Check if the current user has a specific permission.
 */
router.get("/permissions/check/:permission", (req, res) => {
  const role = req.user?.role ?? "technician";
  const permission = req.params.permission as Permission;
  const allowed = hasPermission(role, permission);
  res.json({ permission, role, allowed });
});

export default router;
