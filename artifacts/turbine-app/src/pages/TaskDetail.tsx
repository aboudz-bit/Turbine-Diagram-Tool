import * as React from "react"
import { useParams, useLocation } from "wouter"
import { format, formatDistanceToNow } from "date-fns"
import {
  CheckCircle2, Clock, Pause, Play, AlertCircle,
  ShieldCheck, ChevronRight, Lock, ChevronLeft,
  Calendar, User, Gauge, Timer, Send
} from "lucide-react"
import {
  useGetTask,
  useStartTimeTracking,
  usePauseTimeTracking,
  useResumeTimeTracking,
  useSubmitQcReview
} from "@workspace/api-client-react"
import { Card, Button, Badge, Label, Textarea, Input } from "@/components/ui/core"
import { cn } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:      { label: 'Draft',       color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-300' },
  assigned:   { label: 'Assigned',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
  in_progress:{ label: 'In Progress', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-300' },
  paused:     { label: 'Paused',      color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-300' },
  submitted:  { label: 'Submitted',   color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
  under_qc:   { label: 'Under QC',    color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
  approved:   { label: 'Approved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  rejected:   { label: 'Rejected',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
  overdue:    { label: 'Overdue',     color: 'text-red-700',     bg: 'bg-red-100',    border: 'border-red-400' },
}

const PRIORITY_COLORS = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-blue-500',
}

function formatMinutes(mins?: number | null) {
  if (!mins) return '0h 0m'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id)
  const [, setLocation] = useLocation()

  const { data: task, isLoading, refetch } = useGetTask(taskId, {
    query: { enabled: !!taskId }
  })

  const startMutation = useStartTimeTracking()
  const pauseMutation = usePauseTimeTracking()
  const resumeMutation = useResumeTimeTracking()
  const qcMutation = useSubmitQcReview()

  const [pauseReason, setPauseReason] = React.useState('')
  const [showPauseModal, setShowPauseModal] = React.useState(false)
  const [qcComment, setQcComment] = React.useState('')

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

  const handleStart = async () => {
    await startMutation.mutateAsync({ taskId, data: {} })
    refetch()
  }
  const handlePause = async () => {
    if (!pauseReason) return
    await pauseMutation.mutateAsync({ taskId, data: { reason: pauseReason } })
    setShowPauseModal(false)
    setPauseReason('')
    refetch()
  }
  const handleResume = async () => {
    await resumeMutation.mutateAsync({ taskId })
    refetch()
  }
  const handleSubmitForQc = async () => {
    refetch()
  }
  const handleQcSubmit = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !qcComment) return
    await qcMutation.mutateAsync({ taskId, data: { decision, comments: qcComment } })
    refetch()
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">
      {/* ── BACK NAV ── */}
      <button onClick={() => setLocation('/tasks')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 group">
        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" /> Back to Task List
      </button>

      {/* ── TASK HEADER ── */}
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
                  {task.stageName && <>
                    <ChevronRight className="w-3 h-3" />
                    <span>{task.stageName}</span>
                  </>}
                  {task.componentName && <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-primary font-medium">{task.componentName}</span>
                  </>}
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

      {/* ── MAIN BODY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: description + time log + QC history */}
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
                          {te.pauseReason ? (
                            <span className="text-amber-600">Paused: {te.pauseReason}</span>
                          ) : '—'}
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
                            className="text-[10px] uppercase tracking-wider">
                            {qc.decision}
                          </Badge>
                          <span className="text-xs text-muted-foreground">by {qc.reviewerName}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(qc.createdAt), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      {qc.comments && (
                        <p className="text-xs text-foreground leading-relaxed">{qc.comments}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: action panels */}
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
          {!isLocked && (
            <Card className={cn("p-6", task.activeTimeEntry && "border-sky-300 bg-sky-50/30")}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-5 flex items-center gap-2">
                <Timer className="w-3.5 h-3.5" /> Time Tracking
              </h3>

              <div className={cn("rounded-xl p-4 mb-4 text-center border",
                task.activeTimeEntry ? "bg-sky-50 border-sky-200" : "bg-muted/50 border-border")}>
                <div className="text-3xl font-display font-bold font-mono tabular-nums text-foreground">
                  {formatMinutes(task.totalMinutes)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Logged</div>
                {task.activeTimeEntry && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-sky-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    Running now
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {(task.status === 'assigned' || task.status === 'draft' ||
                  (!task.activeTimeEntry && !['paused', 'in_progress'].includes(task.status))) && (
                  <Button onClick={handleStart} className="w-full gap-2"
                    disabled={startMutation.isPending}>
                    <Play className="w-4 h-4" />
                    {startMutation.isPending ? 'Starting...' : 'Start Work'}
                  </Button>
                )}

                {task.activeTimeEntry && (
                  <Button onClick={() => setShowPauseModal(true)}
                    className="w-full gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300"
                    disabled={pauseMutation.isPending}>
                    <Pause className="w-4 h-4" />
                    {pauseMutation.isPending ? 'Pausing...' : 'Pause Work'}
                  </Button>
                )}

                {task.status === 'paused' && !task.activeTimeEntry && (
                  <Button onClick={handleResume}
                    className="w-full gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
                    disabled={resumeMutation.isPending}>
                    <Play className="w-4 h-4" />
                    {resumeMutation.isPending ? 'Resuming...' : 'Resume Work'}
                  </Button>
                )}

                {task.status === 'in_progress' && !task.activeTimeEntry && (
                  <Button className="w-full gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-300">
                    <Send className="w-4 h-4" /> Submit for QC Review
                  </Button>
                )}
              </div>

              {showPauseModal && (
                <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30 space-y-3">
                  <Label className="text-xs text-muted-foreground">Pause Reason *</Label>
                  <Input
                    value={pauseReason}
                    onChange={e => setPauseReason(e.target.value)}
                    placeholder="e.g., awaiting parts delivery"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1 text-xs"
                      onClick={() => setShowPauseModal(false)}>Cancel</Button>
                    <Button className="flex-1 text-xs"
                      onClick={handlePause} disabled={!pauseReason || pauseMutation.isPending}>
                      Confirm Pause
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* QC DECISION PANEL */}
          {!isLocked && ['submitted', 'under_qc'].includes(task.status) && (
            <Card className="p-6 border-purple-300 bg-purple-50/50">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-700 mb-5 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Quality Control Review
              </h3>
              <div className="space-y-3">
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
                    disabled={qcMutation.isPending}
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
              </div>
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
