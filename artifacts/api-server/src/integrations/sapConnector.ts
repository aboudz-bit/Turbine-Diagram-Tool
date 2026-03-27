/**
 * SAP Integration Connector — Placeholder
 *
 * Future integration with SAP Plant Maintenance (PM) module.
 * Interface design ready for:
 * - Work order sync (SAP → Turbine QC)
 * - Task completion sync (Turbine QC → SAP)
 * - Material/parts lookup
 * - Cost center mapping
 */

export interface SapWorkOrder {
  workOrderNumber: string;
  functionalLocation: string;
  description: string;
  plannerGroup: string;
  maintenancePlant: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export interface SapCompletionReport {
  workOrderNumber: string;
  taskId: number;
  completedAt: string;
  totalHours: number;
  technicianName: string;
  findings: string;
  qcStatus: "approved" | "rejected";
}

export interface SapConnectorConfig {
  baseUrl: string;
  clientId: string;
  sapSystem: string;
  enabled: boolean;
}

const defaultConfig: SapConnectorConfig = {
  baseUrl: process.env.SAP_API_URL ?? "",
  clientId: process.env.SAP_CLIENT_ID ?? "",
  sapSystem: process.env.SAP_SYSTEM ?? "PRD",
  enabled: false,
};

/**
 * Fetch work orders from SAP PM module.
 * Placeholder — returns empty array until SAP is configured.
 */
export async function fetchWorkOrders(
  _functionalLocation?: string,
): Promise<SapWorkOrder[]> {
  if (!defaultConfig.enabled) {
    console.log("[sapConnector] SAP integration not enabled — returning empty");
    return [];
  }
  // Future: HTTP call to SAP OData API
  // GET /sap/opu/odata/sap/API_MAINTORDER_SRV/MaintenanceOrder
  return [];
}

/**
 * Push task completion report to SAP.
 * Placeholder — logs only until SAP is configured.
 */
export async function pushCompletionReport(
  _report: SapCompletionReport,
): Promise<{ success: boolean; sapReference?: string }> {
  if (!defaultConfig.enabled) {
    console.log("[sapConnector] SAP integration not enabled — skipping push");
    return { success: false };
  }
  // Future: POST to SAP confirmation endpoint
  return { success: false };
}

/**
 * Check SAP connection health.
 */
export async function checkSapHealth(): Promise<{
  connected: boolean;
  system: string;
}> {
  return {
    connected: defaultConfig.enabled,
    system: defaultConfig.sapSystem,
  };
}
