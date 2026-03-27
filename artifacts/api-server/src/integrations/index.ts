/**
 * Integration Layer — Central export
 *
 * All external system integrations are accessible from here.
 * Each integration follows a clean interface pattern:
 * - Typed request/response interfaces
 * - Health check function
 * - Enabled/disabled toggle via environment variables
 * - Non-throwing (graceful degradation)
 */

export { fetchWorkOrders, pushCompletionReport, checkSapHealth } from "./sapConnector";
export type { SapWorkOrder, SapCompletionReport } from "./sapConnector";

export { getLatestReadings, evaluateThresholds, checkIotHealth } from "./iotSensorHub";
export type { SensorReading, SensorAlert, SensorType } from "./iotSensorHub";

export { getPrediction, detectAnomalies, getMaintenanceRecommendations, checkPredictiveHealth } from "./predictiveMaintenance";
export type { PredictionRequest, MaintenancePrediction } from "./predictiveMaintenance";
