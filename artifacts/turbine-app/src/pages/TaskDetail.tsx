import * as React from "react"
import { useParams, useLocation } from "wouter"
import { format, formatDistanceToNow } from "date-fns"
import {
  CheckCircle2, Clock, Pause, Play, AlertCircle,
  ShieldCheck, ChevronRight, Lock, ChevronLeft,
  Calendar, User, Gauge, Timer, Send, ShieldAlert,
  AlertTriangle, ChevronDown, ChevronUp, Pen,
  Square, Paperclip, History, Trash2, Upload,
  FileText, ImageIcon,
} from "lucide-react"
import {
  useGetTask,
  useStartTimeTracking,
  usePauseTimeTracking,
  useResumeTimeTracking,
  useStopTimeTracking,
  useSubmitQcReview,
  useGetTaskAuditLog,
  useListAttachments,
  useCreateAttachment,
  useDeleteAttachment,
  useRequestUploadUrl,
} from "@workspace/api-client-react"
import { Card, Button, Badge, Label, Textarea, Input } from "@/components/ui/core"
import { cn } from "@/lib/utils"
import { getQcContext, type QcContext } from "@/lib/qcRules"
import type { TurbineModel, TurbineSectionSlug } from "@/lib/turbineTemplates"
import { usePermissions } from "@/hooks/usePermissions"
import { SignaturePad } from "@/components/SignaturePad"
import { TaskChecklist } from "@/components/TaskChecklist"
import { useAuth } from "@/hooks/useAuth"

// ── helpers ───────────────────────────────────────────────────────────────────
function getTurbineModel(assetName?: string | null): TurbineModel | null {
  if (!assetName) return null
  if (assetName.includes('SGT-9000HL')) return 'SGT-9000HL'
  if (assetName.includes('SGT-8000H')) return 'SGT-8000H'
  return null
}

const SECTION_SLUG_BY_NAME: Record<string, TurbineSectionSlug> = {
  'Compressor': 'compressor',
  'Mid Frame': 'mid-frame',
  'Combustion Chamber': 'mid-frame',
  'Turbine': 'turbine',
  'Turbine Exit Cylinder': 'exit-cylinder',
  'Exhaust Diffuser': 'exit-cylinder',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:           { label: 'Draft',           color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-300' },
  assigned:        { label: 'Assigned',        color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
  in_progress:     { label: 'In Progress',     color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-300' },
  paused:          { label: 'Paused',          color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300' },
  submitted:       { label: 'Submitted',       color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
  under_qc:        { label: 'Under QC',        color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
  approved:        { label: 'Approved',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  rejected:        { label: 'Rejected',        color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
  revision_needed: { label: 'Revision Needed', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
  overdue:         { label: 'Overdue',         color: 'text-red-700',     bg: 'bg-red-100',    border: 'border-red-400' },
}

const PRIORITY_COLORS = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' }

function formatMinutes(mins?: number | null) {
  if (!mins) return '0h 0m'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const PAUSE_PRESETS = [
  'Waiting for parts',
  'Safety hold',
  'Access issue',
  'Inspection delay',
  'Shift end',
]

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const MAX_FILE_BYTES = 20 * 1024 * 1024

// ── QcRulesDetailPanel (unchanged) ───────────────────────────────────────────
function QcRulesDetailPanel({ qcContext, turbineModel }: { qcContext: QcContext; turbineModel: TurbineModel }) {
  const [open, setOpen] = React.useState(false)
  const mandatoryCount = qcContext.rules.filter(r => r.mandatory).length

  return (
    <Card className="overflow-hidden">
      {qcContext.warning && (
        <div className={`flex items-start gap-3 px-5 py-3.5 border-b border-border ${qcContext.isCriticalZone ? 'bg-red-50' : 'bg-amber-50'}`}>
          {qcContext.isCriticalZone
            ? <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            {qcContext.isCriticalZone && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 mb-0.5">
                Critical Zone — {turbineModel}
              </p>
            )}
            <p className={`text-xs font-medium ${qcContext.isCriticalZone ? 'text-red-700' : 'text-amber-800'}`}>
              {qcContext.warning}
            </p>
            {qcContext.oemProcedure && (
              <p className={`text-[10px] mt-0.5 font-mono ${qcContext.isCriticalZone ? 'text-red-600' : 'text-amber-700'}`}>
                OEM Procedure: {qcContext.oemProcedure} — mandatory, overrides all templates
              </p>
            )}
          </div>
        </div>
      )}

      <button
        className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <ShieldAlert className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-xs font-semibold text-foreground">{turbineModel} QC Requirements</span>
          <span className="text-[10px] text-muted-foreground ml-2">
            {mandatoryCount} mandatory · {qcContext.rules.length - mandatoryCount} recommended
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground mr-1">{qcContext.oemProcedure}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 space-y-2 border-t border-border">
          {qcContext.rules.map((rule) => (
            <div key={rule.id} className={`flex items-start gap-2.5 p-3 rounded-xl ${rule.mandatory ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${rule.mandatory ? 'bg-primary text-white' : 'bg-muted border border-border text-muted-foreground'}`}>
                {rule.mandatory ? <ShieldAlert className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug">{rule.label}</p>
                {rule.detail && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{rule.detail}</p>}
              </div>
              {rule.mandatory && (
                <span className="text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded tracking-wide flex-shrink-0">REQ</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function saveSignature(taskId: number, signatureType: string, signatureData: string): Promise<void> {
  const token = localStorage.getItem("turbine_auth_token")
  const res = await fetch(`/api/tasks/${taskId}/signatures`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ signatureType, signatureData }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? "Failed to save signature")
  }
}

async function submitTaskForQc(taskId: number, version: number): Promise<void> {
  const token = localStorage.getItem("turbine_auth_token")
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "submitted", version }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? "Failed to submit task")
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id)
  const [, setLocation] = useLocation()
  const { canApproveQc } = usePermissions()
  const { user } = useAuth()

  const { data: task, isLoading, refetch } = useGetTask(taskId, {
    query: { enabled: !!taskId }
  })

  const startMutation = useStartTimeTracking()
  const pauseMutation = usePauseTimeTracking()
  const resumeMutation = useResumeTimeTracking()
  const stopMutation = useStopTimeTracking()
  const qcMutation = useSubmitQcReview()
  const createAttachmentMutation = useCreateAttachment()
  const deleteAttachmentMutation = useDeleteAttachment()
  const requestUploadUrlMutation = useRequestUploadUrl()

  const { data: attachmentsData, refetch: refetchAttachments } = useListAttachments(taskId, {
    query: { enabled: !!taskId }
  })
  const { data: auditData } = useGetTaskAuditLog(taskId, {
    query: { enabled: !!taskId }
  })

  const [pauseReason, setPauseReason] = React.useState('')
  const [showPauseModal, setShowPauseModal] = React.useState(false)
  const [qcComment, setQcComment] = React.useState('')
  const [submitError, setSubmitError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [sigError, setSigError] = React.useState('')
  const [elapsedSecs, setElapsedSecs] = React.useState(0)
  const [uploadError, setUploadError] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [actionError, setActionError] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!task?.activeTimeEntry) { setElapsedSecs(0); return }
    const start = new Date(task.activeTimeEntry.startTime).getTime()
    const tick = () => setElapsedSecs(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [task?.activeTimeEntry?.startTime])

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.draft
  const isLocked = task.status === 'approved'
  const priorityColor = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || 'bg-slate-400'

  const turbineModel = getTurbineModel(task.assetName)
  const sectionSlug = task.sectionName ? SECTION_SLUG_BY_NAME[task.sectionName] ?? null : null
  const qcContext = turbineModel && sectionSlug ? getQcContext(turbineModel, sectionSlug) : null

  // Signatures from task detail response
  const signatures = (task as unknown as { signatures?: Array<{ signatureType: string; signerName: string; signerRole: string; createdAt: string }> }).signatures ?? []
  const techSig = signatures.find(s => s.signatureType === 'technician_completion') ?? null
  const supervisorSig = signatures.find(s => s.signatureType === 'supervisor_qc_approval') ?? null

  // ── handlers ──────────────────────────────────────────────────────────────
  const extractErrorMessage = (err: unknown, fallback: string): string => {
    const apiData = err && typeof err === 'object' && 'data' in err
      ? (err as { data?: { error?: string } }).data
      : null
    return apiData?.error || (err instanceof Error ? err.message : fallback)
  }

  const handleStart = async () => {
    setActionError('')
    try {
      await startMutation.mutateAsync({ taskId, data: {} })
      refetch()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to start work'))
    }
  }

  const handlePause = async () => {
    if (!pauseReason) return
    setActionError('')
    try {
      await pauseMutation.mutateAsync({ taskId, data: { reason: pauseReason } })
      setShowPauseModal(false)
      setPauseReason('')
      refetch()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to pause work'))
    }
  }

  const handleResume = async () => {
    setActionError('')
    try {
      await resumeMutation.mutateAsync({ taskId })
      refetch()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to resume work'))
    }
  }

  const handleStop = async () => {
    await stopMutation.mutateAsync({ taskId })
    refetch()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) fileInputRef.current = e.target
    if (!file) return
    setUploadError('')
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('File type not allowed. Use images, PDF, or Word documents.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File too large. Maximum size is 20 MB.')
      return
    }
    setUploading(true)
    try {
      const { uploadURL, objectPath } = await requestUploadUrlMutation.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type }
      })
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      await createAttachmentMutation.mutateAsync({
        taskId,
        data: { fileName: file.name, mimeType: file.type, fileSize: file.size, storageUrl: objectPath },
      })
      refetchAttachments()
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    await deleteAttachmentMutation.mutateAsync({ taskId, attachmentId })
    refetchAttachments()
  }

  const handleSaveTechSignature = async (dataUrl: string) => {
    setSigError('')
    await saveSignature(taskId, 'technician_completion', dataUrl)
    refetch()
  }

  const handleSaveSupervisorSignature = async (dataUrl: string) => {
    setSigError('')
    await saveSignature(taskId, 'supervisor_qc_approval', dataUrl)
    refetch()
  }

  const handleSubmitForQc = async () => {
    if (!techSig) {
      setSubmitError('Technician completion signature is required before submitting.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitTaskForQc(taskId, task.version ?? 1)
      refetch()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQcSubmit = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !qcComment) return
    if (decision === 'approved' && !supervisorSig) {
      setSigError('QC approval signature required before approving.')
      return
    }
    setSigError('')
    setActionError('')
    try {
      await qcMutation.mutateAsync({ taskId, data: { decision, comments: qcComment } })
      refetch()
    } catch (err) {
      setActionError(extractErrorMessage(err, `Failed to ${decision === 'approved' ? 'approve' : 'reject'} task`))
    }
  }

  const canSubmit = ['in_progress', 'paused', 'revision_needed'].includes(task.status) && !task.activeTimeEntry

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">

      {/* BACK NAV */}
      <button onClick={() => setLocation('/tasks')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 group">
        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" /> Back to Task List
      </button>

      {/* TASK HEADER */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${isLocked ? 'border-emerald-300 bg-emerald-50/50' : 'border-border bg-white'}`}>
        <div className="flex items-center gap-0">
          <div className={`w-1.5 self-stretch ${priorityColor}`} />
          <div className="flex-1 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">TSK-{task.id.toString().padStart(4, '0')}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.color} ${status.bg} ${status.border}`}>
                    {task.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />}
                    {task.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                    {task.status === 'approved' && <Lock className="w-3 h-3" />}
                    {status.label}
                  </span>
                  {isLocked && <span className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> QC Approved — Read Only</span>}
                </div>
                <h1 className="text-xl font-display font-bold text-foreground leading-tight">{task.title}</h1>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span>{task.assetName || 'SGT-9000HL'}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span>{task.sectionName}</span>
                  {task.stageName && <><ChevronRight className="w-3 h-3" /><span>{task.stageName}</span></>}
                  {task.componentName && <><ChevronRight className="w-3 h-3" /><span className="text-primary font-medium">{task.componentName}</span></>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 text-xs flex-shrink-0 sm:min-w-[140px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>{task.assignedToName || 'Unassigned'}</span>
                </div>
                {task.deadline && (
                  <div className={cn("flex items-center gap-1.5", task.status === 'overdue' ? 'text-red-600' : 'text-muted-foreground')}>
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(task.deadline), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {task.estimatedHours && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Gauge className="w-3 h-3" />
                    <span>{task.estimatedHours}h est.</span>
                  </div>
                )}
                {task.totalMinutes != null && task.totalMinutes > 0 && (
                  <div className="flex items-center gap-1.5 text-sky-600">
                    <Timer className="w-3 h-3" />
                    <span>{formatMinutes(task.totalMinutes)} logged</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-1">
                  <span className={`capitalize font-medium ${task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {task.priority} priority
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: description + time log + QC history ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <Card className={cn("p-6", isLocked && "opacity-80")}>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Work Order Description
            </h3>
            <div className="bg-muted/50 rounded-xl p-5 text-sm text-foreground leading-relaxed border border-border min-h-[90px] whitespace-pre-wrap">
              {task.description || <span className="text-muted-foreground italic">No description provided</span>}
            </div>
          </Card>

          {/* QC Requirements panel (model-aware) */}
          {qcContext && <QcRulesDetailPanel qcContext={qcContext} turbineModel={turbineModel!} />}

          {/* Time Log */}
          <Card className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Time Log
              {task.totalMinutes ? (
                <span className="ml-auto font-mono text-sky-600 font-bold text-sm normal-case tracking-normal">
                  {formatMinutes(task.totalMinutes)} total
                </span>
              ) : null}
            </h3>
            {task.timeEntries && task.timeEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-muted-foreground font-semibold">Start</th>
                      <th className="pb-2 text-left text-muted-foreground font-semibold">End</th>
                      <th className="pb-2 text-center text-muted-foreground font-semibold">Duration</th>
                      <th className="pb-2 text-left text-muted-foreground font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {task.timeEntries.map(te => (
                      <tr key={te.id}>
                        <td className="py-2.5 pr-4 text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", te.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
                            {format(new Date(te.startTime), 'MMM d, HH:mm')}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-foreground/70 whitespace-nowrap">
                          {te.endTime ? format(new Date(te.endTime), 'HH:mm') : <span className="text-emerald-600 font-medium">Ongoing</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-center font-mono font-medium text-foreground">
                          {te.durationMinutes != null ? formatMinutes(te.durationMinutes) : '—'}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {te.pauseReason ? <span className="text-amber-600">Paused: {te.pauseReason}</span> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground border border-border border-dashed rounded-lg">
                No time logged yet
              </div>
            )}
          </Card>

          {/* QC History */}
          {task.qcReviews && task.qcReviews.length > 0 && (
            <Card className="p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-5 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> QC Review History
              </h3>
              <div className="relative pl-5 space-y-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                {task.qcReviews.map(qc => (
                  <div key={qc.id} className="relative">
                    <div className={cn("absolute -left-3.5 top-1.5 w-3 h-3 rounded-full border-2 border-background",
                      qc.decision === 'approved' ? 'bg-emerald-500' : 'bg-red-500')} />
                    <div className="bg-muted/40 rounded-lg p-3.5 border border-border">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={qc.decision === 'approved' ? 'success' : 'destructive'}
                            className="text-[10px] uppercase tracking-wider">{qc.decision}</Badge>
                          <span className="text-xs text-muted-foreground">by {qc.reviewerName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(qc.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      {qc.comments && <p className="text-xs text-foreground leading-relaxed">{qc.comments}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Signatures record (read-only, shown when task has sigs) */}
          {signatures.length > 0 && (
            <Card className="p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
                <Pen className="w-3.5 h-3.5" /> Electronic Signatures
              </h3>
              <div className="space-y-3">
                {techSig && (
                  <SignaturePad
                    label="Technician Completion Signature"
                    existingSignature={techSig}
                    onSave={handleSaveTechSignature}
                    readOnly={true}
                  />
                )}
                {supervisorSig && (
                  <SignaturePad
                    label="QC Approval Signature"
                    existingSignature={supervisorSig}
                    onSave={handleSaveSupervisorSignature}
                    readOnly={true}
                  />
                )}
              </div>
            </Card>
          )}

          {/* ── ATTACHMENTS ── */}
          <Card className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4 flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" /> Attachments
              {attachmentsData && attachmentsData.length > 0 && (
                <span className="ml-auto text-xs font-semibold text-foreground/60 normal-case tracking-normal">
                  {attachmentsData.length} file{attachmentsData.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {/* Upload area */}
            {!isLocked && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "w-full flex flex-col items-center gap-2 border-2 border-dashed rounded-xl px-4 py-5 transition-colors",
                    uploading
                      ? "border-primary/40 bg-primary/5 cursor-wait"
                      : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                  )}>
                  <Upload className={cn("w-5 h-5", uploading ? "text-primary animate-bounce" : "text-muted-foreground")} />
                  <span className="text-xs text-muted-foreground">
                    {uploading ? 'Uploading…' : 'Click to attach file'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">Images, PDF, Word · Max 20 MB</span>
                </button>
                {uploadError && (
                  <p className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {/* File list */}
            {attachmentsData && attachmentsData.length > 0 ? (
              <div className="mt-4 space-y-2">
                {attachmentsData.map((att) => {
                  const isImg = att.mimeType.startsWith('image/')
                  const canDelete = !isLocked && (user?.id === att.uploadedByUserId || canApproveQc)
                  return (
                    <div key={att.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {isImg
                          ? <ImageIcon className="w-4 h-4 text-sky-500" />
                          : <FileText className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={att.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-foreground hover:text-primary truncate block transition-colors">
                          {att.fileName}
                        </a>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {att.uploaderName ?? 'Unknown'} · {formatDistanceToNow(new Date(att.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          disabled={deleteAttachmentMutation.isPending}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 text-center py-4 text-xs text-muted-foreground">
                No attachments yet
              </div>
            )}
          </Card>

          {/* ── QC CHECKLIST ── */}
          <TaskChecklist
            taskId={taskId}
            readOnly={task.status === 'approved'}
          />

          {/* ── AUDIT LOG ── */}
          {auditData && auditData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-5 flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Activity Log
              </h3>
              <div className="relative pl-5 space-y-3">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                {auditData.map((entry) => (
                  <div key={entry.id} className="relative">
                    <div className="absolute -left-3.5 top-2 w-2.5 h-2.5 rounded-full bg-muted border-2 border-background" />
                    <div className="bg-muted/30 rounded-lg px-3.5 py-2.5 border border-border">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-xs font-semibold text-foreground">{entry.actionLabel}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">by {entry.actorName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          {Object.entries(entry.details as Record<string, unknown>)
                            .filter(([, v]) => v != null && v !== '')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT: action panels ── */}
        <div className="space-y-5">

          {/* APPROVED LOCK STATE */}
          {isLocked && (
            <Card className="p-7 border-emerald-300 bg-emerald-50 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-display font-bold text-foreground text-base">Task Approved</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                This work order has been QC approved and is locked. No further modifications are permitted.
              </p>
              {task.completedAt && (
                <p className="text-xs text-emerald-600 mt-3 font-medium">
                  Completed {formatDistanceToNow(new Date(task.completedAt))} ago
                </p>
              )}
            </Card>
          )}

          {/* TIME TRACKING PANEL */}
          {!isLocked && !['submitted', 'under_qc'].includes(task.status) && (
            <Card className={cn("p-6", task.activeTimeEntry && "border-sky-300 bg-sky-50/30")}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-5 flex items-center gap-2">
                <Timer className="w-3.5 h-3.5" /> Time Tracking
              </h3>

              {/* Live timer display */}
              <div className={cn("rounded-xl p-4 mb-4 text-center border",
                task.activeTimeEntry ? "bg-sky-50 border-sky-200" : "bg-muted/50 border-border")}>
                {task.activeTimeEntry ? (
                  <>
                    <div className="text-4xl font-display font-bold font-mono tabular-nums text-sky-700 tracking-tight">
                      {formatElapsed(elapsedSecs)}
                    </div>
                    <div className="text-[10px] text-sky-600 mt-1 uppercase tracking-widest font-semibold">Live Session</div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      {formatMinutes(task.totalMinutes)} total logged
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-sky-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      Running now
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-display font-bold font-mono tabular-nums text-foreground">
                      {formatMinutes(task.totalMinutes)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Total Logged</div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {(task.status === 'assigned' || task.status === 'draft' ||
                  (!task.activeTimeEntry && !['paused', 'in_progress'].includes(task.status))) && (
                  <Button onClick={handleStart} className="w-full gap-2" disabled={startMutation.isPending}>
                    <Play className="w-4 h-4" />
                    {startMutation.isPending ? 'Starting...' : 'Start Work'}
                  </Button>
                )}

                {task.activeTimeEntry && (
                  <>
                    <Button onClick={() => setShowPauseModal(v => !v)}
                      className="w-full gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300"
                      disabled={pauseMutation.isPending}>
                      <Pause className="w-4 h-4" />
                      {pauseMutation.isPending ? 'Pausing...' : 'Pause Work'}
                    </Button>
                    <Button onClick={handleStop}
                      className="w-full gap-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-300"
                      disabled={stopMutation.isPending}>
                      <Square className="w-4 h-4" />
                      {stopMutation.isPending ? 'Stopping...' : 'Stop Work'}
                    </Button>
                  </>
                )}

                {task.status === 'paused' && !task.activeTimeEntry && (
                  <Button onClick={handleResume}
                    className="w-full gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
                    disabled={resumeMutation.isPending}>
                    <Play className="w-4 h-4" />
                    {resumeMutation.isPending ? 'Resuming...' : 'Resume Work'}
                  </Button>
                )}
              </div>

              {actionError && (
                <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {actionError}
                </p>
              )}

              {showPauseModal && (
                <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30 space-y-3">
                  <Label className="text-xs text-muted-foreground">Pause Reason *</Label>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {PAUSE_PRESETS.map(preset => (
                      <button key={preset} type="button"
                        onClick={() => setPauseReason(preset)}
                        className={cn(
                          "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors",
                          pauseReason === preset
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
                        )}>
                        {preset}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={pauseReason}
                    onChange={e => setPauseReason(e.target.value)}
                    placeholder="or type a custom reason…"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1 text-xs"
                      onClick={() => { setShowPauseModal(false); setPauseReason('') }}>
                      Cancel
                    </Button>
                    <Button className="flex-1 text-xs" onClick={handlePause}
                      disabled={!pauseReason || pauseMutation.isPending}>
                      Confirm Pause
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* TECHNICIAN COMPLETION SIGNATURE + SUBMIT */}
          {!isLocked && canSubmit && (
            <Card className="p-6 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2">
                <Pen className="w-3.5 h-3.5" /> Completion Signature
              </h3>

              <SignaturePad
                label="Technician Completion"
                existingSignature={techSig}
                onSave={handleSaveTechSignature}
                readOnly={false}
              />

              {!techSig && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  Sign above to enable submission for QC review
                </p>
              )}

              {submitError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <Button
                onClick={handleSubmitForQc}
                disabled={!techSig || submitting}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit for QC Review'}
              </Button>
            </Card>
          )}

          {/* QC DECISION PANEL — only shown to QC-role users */}
          {!isLocked && ['submitted', 'under_qc'].includes(task.status) && canApproveQc && (
            <Card className="p-6 border-purple-300 bg-purple-50/50 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-700 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Quality Control Review
              </h3>

              {/* QC Signature */}
              <SignaturePad
                label="QC Approval Signature"
                existingSignature={supervisorSig}
                onSave={handleSaveSupervisorSignature}
                readOnly={false}
              />

              {!supervisorSig && (
                <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                  <Pen className="w-3 h-3 flex-shrink-0" />
                  Sign above before you can approve this task
                </p>
              )}

              {sigError && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {sigError}
                </p>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Review Comments</Label>
                <Textarea
                  placeholder="Provide feedback, findings, or approval notes..."
                  value={qcComment}
                  onChange={e => setQcComment(e.target.value)}
                  className="text-xs min-h-[80px] resize-none"
                />
                {!qcComment && (
                  <p className="text-[10px] text-muted-foreground mt-1">Comment required to reject</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleQcSubmit('approved')}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  disabled={qcMutation.isPending || !supervisorSig}
                  title={!supervisorSig ? "QC signature required" : ""}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button
                  onClick={() => handleQcSubmit('rejected')}
                  variant="destructive"
                  className="gap-1.5 text-sm"
                  disabled={!qcComment || qcMutation.isPending}
                >
                  Reject
                </Button>
              </div>

              {actionError && (
                <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {actionError}
                </p>
              )}
            </Card>
          )}

          {/* QC submitted panel — shown to technicians when submitted */}
          {!isLocked && ['submitted', 'under_qc'].includes(task.status) && !canApproveQc && (
            <Card className="p-6 border-purple-200 bg-purple-50/30 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-purple-800">Awaiting QC Review</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                This task has been submitted and is pending quality control review by a supervisor or engineer.
              </p>
            </Card>
          )}

          {/* TASK INFO PANEL */}
          <Card className="p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-5">Task Info</h3>
            <div className="space-y-0 text-xs">
              {[
                { label: 'Created', value: task.createdAt ? formatDistanceToNow(new Date(task.createdAt), { addSuffix: true }) : '—' },
                { label: 'Status', value: status.label },
                { label: 'Priority', value: task.priority, color: task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-blue-600' },
                { label: 'Est. Hours', value: task.estimatedHours ? `${task.estimatedHours}h` : '—' },
                { label: 'Logged', value: formatMinutes(task.totalMinutes) },
                { label: 'Signatures', value: signatures.length > 0 ? `${signatures.length} on file` : 'None' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className={cn("font-semibold capitalize text-foreground", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
