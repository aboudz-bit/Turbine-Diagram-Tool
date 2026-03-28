/**
 * Blade Map — Visual Grid
 *
 * Renders a circular/grid view of all blades in a stage.
 * Each blade is clickable to record its inspection status:
 *   pass (green), fail (red), attention (amber), unrecorded (gray)
 */
import * as React from "react";
import { Card } from "@/components/ui/core";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export type BladeStatus = "pass" | "fail" | "attention" | "unrecorded";

interface BladeData {
  index: number;
  status: BladeStatus;
  note?: string;
}

interface Props {
  bladeCount: number;
  stageLabel: string;
  initialData?: BladeData[];
  readOnly?: boolean;
  onChange?: (blades: BladeData[]) => void;
}

const STATUS_COLORS: Record<BladeStatus, string> = {
  pass: "bg-emerald-500 hover:bg-emerald-600 text-white",
  fail: "bg-red-500 hover:bg-red-600 text-white",
  attention: "bg-amber-500 hover:bg-amber-600 text-white",
  unrecorded: "bg-muted hover:bg-muted-foreground/20 text-muted-foreground",
};

const STATUS_RING: Record<BladeStatus, string> = {
  pass: "ring-emerald-300",
  fail: "ring-red-300",
  attention: "ring-amber-300",
  unrecorded: "ring-transparent",
};

const CYCLE: BladeStatus[] = ["unrecorded", "pass", "attention", "fail"];

export function BladeMap({ bladeCount, stageLabel, initialData, readOnly = false, onChange }: Props) {
  const [blades, setBlades] = React.useState<BladeData[]>(() => {
    if (initialData && initialData.length === bladeCount) return initialData;
    return Array.from({ length: bladeCount }, (_, i) => ({
      index: i + 1,
      status: initialData?.find(b => b.index === i + 1)?.status ?? "unrecorded" as BladeStatus,
      note: initialData?.find(b => b.index === i + 1)?.note,
    }));
  });

  const [selected, setSelected] = React.useState<number | null>(null);

  function toggleBlade(idx: number) {
    if (readOnly) return;
    setBlades(prev => {
      const updated = prev.map(b => {
        if (b.index !== idx) return b;
        const currentIdx = CYCLE.indexOf(b.status);
        const nextStatus = CYCLE[(currentIdx + 1) % CYCLE.length];
        return { ...b, status: nextStatus };
      });
      onChange?.(updated);
      return updated;
    });
  }

  const counts = React.useMemo(() => ({
    pass: blades.filter(b => b.status === "pass").length,
    fail: blades.filter(b => b.status === "fail").length,
    attention: blades.filter(b => b.status === "attention").length,
    unrecorded: blades.filter(b => b.status === "unrecorded").length,
  }), [blades]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{stageLabel} — Blade Map</h3>
          <p className="text-[10px] text-muted-foreground">{bladeCount} blades — click to cycle status</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {counts.pass}</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> {counts.attention}</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {counts.fail}</span>
          <span className="text-muted-foreground">{counts.unrecorded} pending</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 transition-all" style={{ width: `${(counts.pass / bladeCount) * 100}%` }} />
        <div className="bg-amber-500 transition-all" style={{ width: `${(counts.attention / bladeCount) * 100}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${(counts.fail / bladeCount) * 100}%` }} />
      </div>

      {/* Blade grid */}
      <div className="flex flex-wrap gap-1">
        {blades.map(blade => (
          <button
            key={blade.index}
            type="button"
            onClick={() => { toggleBlade(blade.index); setSelected(blade.index); }}
            onMouseEnter={() => setSelected(blade.index)}
            onMouseLeave={() => setSelected(null)}
            disabled={readOnly}
            className={cn(
              "w-7 h-7 rounded text-[9px] font-bold transition-all ring-1 relative",
              "flex items-center justify-center",
              STATUS_COLORS[blade.status],
              STATUS_RING[blade.status],
              !readOnly && "cursor-pointer active:scale-90",
              readOnly && "cursor-default",
            )}
            title={`Blade ${blade.index}: ${blade.status}${blade.note ? ` — ${blade.note}` : ""}`}
          >
            {blade.index}
          </button>
        ))}
      </div>

      {/* Selected blade detail */}
      {selected && (
        <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
          Blade #{selected} — <span className="font-medium capitalize">{blades.find(b => b.index === selected)?.status ?? "unrecorded"}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t pt-2">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Pass</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Attention</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Fail</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Unrecorded</span>
      </div>
    </Card>
  );
}
