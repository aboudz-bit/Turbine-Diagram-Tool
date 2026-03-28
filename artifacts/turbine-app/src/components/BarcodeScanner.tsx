/**
 * Barcode / QR Scanner for Components
 *
 * Uses the device camera (via getUserMedia) to scan QR codes
 * that map to assets, sections, stages, or individual components.
 * Format: "asset:1", "section:3", "stage:5", "component:12"
 */
import * as React from "react";
import { Button, Card } from "@/components/ui/core";
import { Camera, QrCode, X, Loader2, ExternalLink } from "lucide-react";
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
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = React.useState("");
  const [, setLocation] = useLocation();
  const streamRef = React.useRef<MediaStream | null>(null);

  async function startCamera() {
    try {
      setError(null);
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("Camera access denied or unavailable. Use manual entry below.");
      setScanning(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  React.useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  async function resolveCode(code: string) {
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
      const scanResult: ScanResult = {
        type: data.type ?? code.split(":")[0],
        entityId: data.entityId ?? parseInt(code.split(":")[1]),
        label: data.label ?? code,
        breadcrumb: data.breadcrumb ?? "",
        openTaskCount: data.openTaskCount ?? 0,
        url: data.url,
      };
      setResult(scanResult);
      onResult?.(scanResult);
      stopCamera();
    } catch {
      setError("Failed to resolve code. Check your connection.");
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
            <h2 className="text-sm font-bold text-foreground">Scan Component</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { stopCamera(); onClose(); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Camera view */}
        {scanning && !result && (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
            </div>
            <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-white/70">
              Point camera at QR code
            </p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <p className="text-xs font-medium text-emerald-800">{result.breadcrumb || result.label}</p>
            <p className="text-[10px] text-emerald-600">
              Type: {result.type} &middot; {result.openTaskCount} open task(s)
            </p>
            {result.url && (
              <Button size="sm" className="w-full mt-2 gap-1" onClick={() => { onClose(); setLocation(result.url!); }}>
                <ExternalLink className="w-3 h-3" /> View Details
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
          <>
            {!scanning && (
              <Button className="w-full gap-2" onClick={startCamera}>
                <Camera className="w-4 h-4" /> Open Camera
              </Button>
            )}
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                <span className="h-px flex-1 bg-border" />
                <span>or enter code manually</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder="e.g. component:12"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border bg-background outline-none focus:border-primary"
                />
                <Button size="sm" type="submit" disabled={!manualInput.trim()}>
                  Lookup
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
