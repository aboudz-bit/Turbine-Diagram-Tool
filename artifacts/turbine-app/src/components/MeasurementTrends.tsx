/**
 * Measurement Trends — Historical measurement chart per component.
 *
 * Shows how measurements (TBC thickness, tip clearance, etc.) change over
 * successive inspections. Red threshold lines highlight out-of-spec values.
 */
import * as React from "react";
import { Card } from "@/components/ui/core";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

export interface MeasurementPoint {
  inspection: string; // label, e.g. "Jan 2025" or "Inspection #3"
  value: number;
}

export interface MeasurementSeries {
  name: string;        // e.g. "TBC Thickness"
  unit: string;        // e.g. "mm"
  data: MeasurementPoint[];
  nominalMin?: number;
  nominalMax?: number;
  alertMin?: number;
  alertMax?: number;
}

interface Props {
  series: MeasurementSeries[];
  componentLabel: string;
}

const COLORS = ["#0284c7", "#7c3aed", "#059669", "#d97706", "#dc2626"];

export function MeasurementTrends({ series, componentLabel }: Props) {
  if (series.length === 0) {
    return (
      <Card className="p-4 text-center text-xs text-muted-foreground">
        No measurement history available for {componentLabel}.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Measurement Trends</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">{componentLabel}</span>
      </div>

      {series.map((s, idx) => {
        // Build chart data
        const chartData = s.data.map(d => ({
          inspection: d.inspection,
          [s.name]: d.value,
        }));

        return (
          <div key={s.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">{s.name} <span className="text-muted-foreground">({s.unit})</span></p>
              {s.nominalMin != null && s.nominalMax != null && (
                <span className="text-[10px] text-muted-foreground">
                  Nominal: {s.nominalMin} – {s.nominalMax} {s.unit}
                </span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="inspection" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value: number) => [`${value} ${s.unit}`, s.name]}
                />
                <Line
                  type="monotone"
                  dataKey={s.name}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
                  activeDot={{ r: 5 }}
                />
                {/* Nominal range lines */}
                {s.nominalMin != null && (
                  <ReferenceLine y={s.nominalMin} stroke="#059669" strokeDasharray="4 4" label={{ value: "Min", position: "left", fontSize: 9, fill: "#059669" }} />
                )}
                {s.nominalMax != null && (
                  <ReferenceLine y={s.nominalMax} stroke="#059669" strokeDasharray="4 4" label={{ value: "Max", position: "left", fontSize: 9, fill: "#059669" }} />
                )}
                {/* Alert thresholds */}
                {s.alertMin != null && (
                  <ReferenceLine y={s.alertMin} stroke="#dc2626" strokeDasharray="2 2" />
                )}
                {s.alertMax != null && (
                  <ReferenceLine y={s.alertMax} stroke="#dc2626" strokeDasharray="2 2" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </Card>
  );
}
