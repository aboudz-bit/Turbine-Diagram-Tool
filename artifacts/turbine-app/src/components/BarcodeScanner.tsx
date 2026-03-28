/**
 * Component Code Lookup
 *
 * Quick lookup for assets, sections, stages, or individual components
 * by entering a code (e.g. "asset:1", "component:12").
 * Resolves via the QR API and shows details with navigation.
 */
import * as React from "react";
import { Button, Card } from "@/components/ui/core";
import { QrCode, X, ExternalLink, Search } from "lucide-react";
import { useLocation } from "wouter";

interface ScanResult {
  type: string;
  entityId: number;
  label: string;
  breadcrumb: string;
  openTaskCount: number;
  url?: string;
}

interface Props {
  onResult?: (result: ScanResult) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onResult, onClose }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [, setLocation] = useLocation();

  async function resolveCode(code: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(code)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("turbine_auth_token") ?? sessionStorage.getItem("turbine_auth_token") ?? ""}`,
        },
      });
      if (!res.ok) {
        setError(`Code "${code}" not recognized. Format: asset:1, section:3, stage:5, component:12`);
        return;
      }
      const data = await res.json();
      const parentPath = Array.isArray(data.parentPath) ? data.parentPath.join(" > ") : "";
      const scanResult: ScanResult = {
        type: data.type ?? code.split(":")[0],
        entityId: data.id ?? parseInt(code.split(":")[1]),
        label: data.name ?? code,
        breadcrumb: parentPath,
        openTaskCount: data.openTaskCount ?? 0,
        url: data.qrPayload ? new URL(data.qrPayload, window.location.origin).pathname + new URL(data.qrPayload, window.location.origin).search : undefined,
      };
      setResult(scanResult);
      onResult?.(scanResult);
    } catch {
      setError("Failed to resolve code. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualInput.trim()) resolveCode(manualInput.trim());
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Quick Lookup</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <p className="text-xs font-medium text-emerald-800">{result.label}</p>
            {result.breadcrumb && (
              <p className="text-[10px] text-emerald-600">{result.breadcrumb}</p>
            )}
            <p className="text-[10px] text-emerald-600">
              Type: {result.type} &middot; {result.openTaskCount} open task(s)
            </p>
            {result.url && (
              <Button size="sm" className="w-full mt-2 gap-1" onClick={() => { onClose(); setLocation(result.url!); }}>
                <ExternalLink className="w-3 h-3" /> View Tasks
              </Button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Manual entry */}
        {!result && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Enter a component code to look up its details and open tasks.
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="e.g. component:12, asset:1"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border bg-background outline-none focus:border-primary"
                autoFocus
              />
              <Button size="sm" type="submit" disabled={!manualInput.trim() || loading} className="gap-1">
                <Search className="w-3 h-3" />
                {loading ? "..." : "Lookup"}
              </Button>
            </form>
          </div>
        )}

        {/* Reset after result */}
        {result && (
          <Button size="sm" variant="outline" className="w-full" onClick={() => { setResult(null); setManualInput(""); }}>
            Look up another
          </Button>
        )}
      </Card>
    </div>
  );
}
