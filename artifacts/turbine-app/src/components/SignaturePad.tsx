import * as React from "react"
import { Button } from "@/components/ui/core"
import { cn } from "@/lib/utils"
import { Pen, Trash2, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

interface SignaturePadProps {
  label: string
  existingSignature?: {
    signerName: string
    signerRole: string
    createdAt: string | Date
  } | null
  onSave: (dataUrl: string) => Promise<void>
  readOnly?: boolean
  className?: string
}

export function SignaturePad({ label, existingSignature, onSave, readOnly = false, className }: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = React.useState(false)
  const [hasStrokes, setHasStrokes] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const lastPos = React.useRef<{ x: number; y: number } | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return
    e.preventDefault()
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#1e3a5f"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    lastPos.current = pos
    setHasStrokes(true)
    setSaved(false)
  }

  const stopDraw = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    setSaved(false)
  }

  const handleSave = async () => {
    const canvas = canvasRef.current!
    if (!hasStrokes) return
    setSaving(true)
    try {
      const dataUrl = canvas.toDataURL("image/png")
      await onSave(dataUrl)
      setSaved(true)
      setHasStrokes(false)
    } finally {
      setSaving(false)
    }
  }

  if (readOnly && existingSignature) {
    return (
      <div className={cn("rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2", className)}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">{label}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{existingSignature.signerName}</span>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="uppercase tracking-wide text-[10px]">{existingSignature.signerRole.replace("_", " ")}</span>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span>{format(new Date(existingSignature.createdAt), "MMM d, yyyy HH:mm")}</span>
        </div>
      </div>
    )
  }

  if (existingSignature) {
    return (
      <div className={cn("rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{label} — Signed</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Signed by <span className="font-medium text-foreground">{existingSignature.signerName}</span> on{" "}
          {format(new Date(existingSignature.createdAt), "MMM d, yyyy HH:mm")}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border border-border bg-white space-y-3 p-4", className)}>
      <div className="flex items-center gap-2">
        <Pen className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Draw your signature below</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={560}
          height={120}
          className="w-full border border-dashed border-border rounded-lg bg-slate-50/80 cursor-crosshair touch-none"
          style={{ height: 100 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasStrokes && !readOnly && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/50 font-medium">
            Sign here
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={clear}
          disabled={!hasStrokes || saving}
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs flex-1"
          onClick={handleSave}
          disabled={!hasStrokes || saving}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {saving ? "Saving..." : saved ? "Saved!" : "Save Signature"}
        </Button>
      </div>
    </div>
  )
}
