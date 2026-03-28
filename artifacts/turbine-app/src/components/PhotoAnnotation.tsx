/**
 * Photo Annotation Tool
 *
 * Canvas-based overlay that lets technicians draw on uploaded images
 * (circles, arrows, text labels) to mark defects before saving.
 */
import * as React from "react";
import { Button } from "@/components/ui/core";
import { Pen, Circle, Type, Undo2, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "circle" | "text";

interface Props {
  imageUrl: string;
  onSave: (annotatedDataUrl: string) => void;
  onClose: () => void;
}

export function PhotoAnnotation({ imageUrl, onSave, onClose }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [drawing, setDrawing] = React.useState(false);
  const [history, setHistory] = React.useState<ImageData[]>([]);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  // Load the background image
  React.useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      canvas.width = img.width;
      canvas.height = img.height;
      overlay.width = img.width;
      overlay.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      saveState();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  function saveState() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function undo() {
    const canvas = overlayRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext("2d")!;
    const prev = history[history.length - 2];
    ctx.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  }

  const startPos = React.useRef({ x: 0, y: 0 });

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    startPos.current = pos;
    setDrawing(true);

    if (tool === "text") {
      const label = prompt("Enter annotation text:");
      if (label) {
        const ctx = overlayRef.current?.getContext("2d");
        if (!ctx) return;
        const fontSize = Math.max(14, Math.round(overlayRef.current!.width / 40));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "#ff0000";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeText(label, pos.x, pos.y);
        ctx.fillText(label, pos.x, pos.y);
        saveState();
      }
      setDrawing(false);
      return;
    }

    if (tool === "pen") {
      const ctx = overlayRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const pos = getPos(e);

    if (tool === "pen") {
      const ctx = overlayRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = Math.max(2, Math.round(overlayRef.current!.width / 200));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  }

  function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    setDrawing(false);

    if (tool === "circle") {
      const pos = getPos(e);
      const ctx = overlayRef.current?.getContext("2d");
      if (!ctx) return;
      const dx = pos.x - startPos.current.x;
      const dy = pos.y - startPos.current.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = Math.max(2, Math.round(overlayRef.current!.width / 200));
      ctx.stroke();
    }

    saveState();
  }

  function handleSave() {
    const bg = canvasRef.current;
    const fg = overlayRef.current;
    if (!bg || !fg) return;
    const merged = document.createElement("canvas");
    merged.width = bg.width;
    merged.height = bg.height;
    const ctx = merged.getContext("2d")!;
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(fg, 0, 0);
    onSave(merged.toDataURL("image/png"));
  }

  const tools: { id: Tool; icon: typeof Pen; label: string }[] = [
    { id: "pen", icon: Pen, label: "Draw" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 bg-card rounded-lg p-2 shadow-lg border">
        {tools.map(t => (
          <Button
            key={t.id}
            size="sm"
            variant={tool === t.id ? "default" : "outline"}
            onClick={() => setTool(t.id)}
            className="gap-1.5"
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="text-xs">{t.label}</span>
          </Button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <Button size="sm" variant="outline" onClick={undo} disabled={history.length <= 1}>
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="default" onClick={handleSave} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs">Save</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Canvas area */}
      <div className="relative max-w-full max-h-[80vh] overflow-auto rounded-lg shadow-xl">
        <canvas ref={canvasRef} className="block max-w-full h-auto" />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (drawing) { setDrawing(false); saveState(); } }}
        />
      </div>
    </div>
  );
}
