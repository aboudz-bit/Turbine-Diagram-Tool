/**
 * IoT Sensor Hub — Placeholder
 *
 * Future integration for receiving real-time sensor data:
 * - Temperature readings (exhaust gas, bearing, inlet)
 * - Vibration levels (shaft, bearing housing)
 * - Pressure differentials
 * - RPM / load data
 *
 * Interface design ready for:
 * - MQTT subscription
 * - REST polling
 * - Event-driven alerts
 */

export interface SensorReading {
  sensorId: string;
  assetId: number;
  componentId?: number;
  type: SensorType;
  value: number;
  unit: string;
  timestamp: string;
  quality: "good" | "uncertain" | "bad";
}

export type SensorType =
  | "temperature"
  | "vibration"
  | "pressure"
  | "rpm"
  | "load"
  | "flow_rate";

export interface SensorThreshold {
  sensorType: SensorType;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  unit: string;
}

export interface SensorAlert {
  sensorId: string;
  assetId: number;
  severity: "warning" | "critical";
  message: string;
  reading: SensorReading;
  threshold: SensorThreshold;
  timestamp: string;
}

// Default thresholds for common turbine sensors
const DEFAULT_THRESHOLDS: Record<string, SensorThreshold> = {
  "exhaust_temp": {
    sensorType: "temperature",
    warningMax: 620,
    criticalMax: 650,
    unit: "°C",
  },
  "bearing_temp": {
    sensorType: "temperature",
    warningMax: 110,
    criticalMax: 130,
    unit: "°C",
  },
  "shaft_vibration": {
    sensorType: "vibration",
    warningMax: 7.0,
    criticalMax: 12.0,
    unit: "mm/s",
  },
  "compressor_pressure": {
    sensorType: "pressure",
    warningMin: 14.0,
    warningMax: 18.0,
    criticalMin: 12.0,
    criticalMax: 20.0,
    unit: "bar",
  },
};

/**
 * Get latest sensor readings for an asset.
 * Placeholder — returns mock data until IoT gateway is configured.
 */
export async function getLatestReadings(
  _assetId: number,
): Promise<SensorReading[]> {
  // Future: query IoT time-series database (InfluxDB, TimescaleDB)
  // or subscribe to MQTT broker
  return [];
}

/**
 * Check sensor readings against thresholds and generate alerts.
 * Placeholder — ready for real-time alerting pipeline.
 */
export function evaluateThresholds(
  readings: SensorReading[],
): SensorAlert[] {
  const alerts: SensorAlert[] = [];

  for (const reading of readings) {
    const threshold = DEFAULT_THRESHOLDS[reading.sensorId];
    if (!threshold) continue;

    if (
      threshold.criticalMax !== undefined &&
      reading.value > threshold.criticalMax
    ) {
      alerts.push({
        sensorId: reading.sensorId,
        assetId: reading.assetId,
        severity: "critical",
        message: `${reading.sensorId} reading ${reading.value}${reading.unit} exceeds critical threshold ${threshold.criticalMax}${threshold.unit}`,
        reading,
        threshold,
        timestamp: new Date().toISOString(),
      });
    } else if (
      threshold.warningMax !== undefined &&
      reading.value > threshold.warningMax
    ) {
      alerts.push({
        sensorId: reading.sensorId,
        assetId: reading.assetId,
        severity: "warning",
        message: `${reading.sensorId} reading ${reading.value}${reading.unit} exceeds warning threshold ${threshold.warningMax}${threshold.unit}`,
        reading,
        threshold,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

/**
 * Check IoT hub connection health.
 */
export async function checkIotHealth(): Promise<{
  connected: boolean;
  protocol: string;
}> {
  return {
    connected: false, // placeholder
    protocol: "mqtt", // future: configurable
  };
}
