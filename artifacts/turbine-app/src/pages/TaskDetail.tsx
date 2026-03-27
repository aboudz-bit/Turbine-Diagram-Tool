import * as React from "react"
import { useParams } from "wouter"
import { format } from "date-fns"
import { 
  CheckCircle2, Clock, Pause, Play, AlertCircle, 
  ArrowRight, ShieldCheck, ChevronRight, Ban 
} from "lucide-react"

import { 
  useGetTask, 
  useListTimeEntries, 
  useListQcReviews, 
  useStartTimeTracking, 
  usePauseTimeTracking, 
  useResumeTimeTracking, 
  useSubmitQcReview 
} from "@workspace/api-client-react"
import { Card, Button, Badge, Label, Textarea, Input } from "@/components/ui/core"
import { cn } from "@/lib/utils"

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const taskId = parseInt(id)

  const { data: task, isLoading, refetch: refetchTask } = useGetTask(taskId, {
    query: { enabled: !!taskId }
  })
  
  const startTimeMutation = useStartTimeTracking()
  const pauseTimeMutation = usePauseTimeTracking()
  const resumeTimeMutation = useResumeTimeTracking()
  const submitQcMutation = useSubmitQcReview()

  const [pauseReason, setPauseReason] = React.useState("")
  const [showPauseModal, setShowPauseModal] = React.useState(false)
  const [qcComment, setQcComment] = React.useState("")
  
  if (isLoading || !task) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  const handleStart = async () => {
    // userId: 1 is hardcoded as per instructions or from context
    await startTimeMutation.mutateAsync({ taskId, data: { userId: 1 } })
    refetchTask()
  }

  const handlePause = async () => {
    if (!pauseReason) return
    await pauseTimeMutation.mutateAsync({ taskId, data: { reason: pauseReason } })
    setShowPauseModal(false)
    setPauseReason("")
    refetchTask()
  }

  const handleResume = async () => {
    await resumeTimeMutation.mutateAsync({ taskId, data: { userId: 1 } })
    refetchTask()
  }

  const handleQcSubmit = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !qcComment) return
    await submitQcMutation.mutateAsync({ taskId, data: { decision, comments: qcComment, reviewerId: 1 } })
    refetchTask()
  }

  const isLocked = task.status === 'approved'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-4 bg-card/50 p-6 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold text-foreground">{task.title}</h1>
              {task.priority === 'high' && <Badge variant="destructive" className="bg-red-500/20 text-red-400">High Priority</Badge>}
              {task.priority === 'medium' && <Badge variant="warning" className="bg-amber-500/20 text-amber-400">Medium Priority</Badge>}
              {task.priority === 'low' && <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Low Priority</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <span>{task.assetName || 'SGT-9000HL'}</span>
              <ChevronRight className="w-4 h-4" />
              <span>{task.sectionName}</span>
              {task.stageName && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span>{task.stageName}</span>
                </>
              )}
              {task.componentName && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-primary">{task.componentName}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <Badge variant={
              task.status === 'approved' ? 'success' : 
              task.status === 'rejected' ? 'destructive' : 
              task.status === 'in_progress' ? 'warning' : 'secondary'
            } className="text-sm px-4 py-1.5 capitalize shadow-sm">
              {task.status.replace('_', ' ')}
            </Badge>
            <div className="text-sm text-muted-foreground mt-2">
              Assigned to: <span className="text-foreground font-medium">{task.assignedToName || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Notes & Description */}
          <Card className="p-6 border-white/5 bg-card/60">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" /> Task Description
            </h3>
            <div className="bg-background/50 rounded-lg p-4 text-sm text-foreground/90 whitespace-pre-wrap border border-white/5 min-h-[100px]">
              {task.description || "No description provided."}
            </div>
          </Card>

          {/* Time Entries History */}
          <Card className="p-6 border-white/5 bg-card/60">
            <h3 className="text-lg font-bold mb-4">Time Entries</h3>
            <div className="space-y-3">
              {task.timeEntries?.map((te) => (
                <div key={te.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-lg border border-white/5 bg-background/30 gap-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", te.isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(te.startTime), "MMM d, HH:mm")} - {te.endTime ? format(new Date(te.endTime), "HH:mm") : "Ongoing"}
                    </span>
                  </div>
                  {te.durationMinutes !== undefined && te.durationMinutes !== null && (
                    <span className="text-sm font-medium">{Math.floor(te.durationMinutes / 60)}h {te.durationMinutes % 60}m</span>
                  )}
                  {te.pauseReason && (
                    <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-1 rounded">Paused: {te.pauseReason}</span>
                  )}
                </div>
              ))}
              {(!task.timeEntries || task.timeEntries.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No time logged yet.</div>
              )}
            </div>
          </Card>

          {/* QC Review History */}
          {task.qcReviews && task.qcReviews.length > 0 && (
            <Card className="p-6 border-white/5 bg-card/60">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> QC History
              </h3>
              <div className="space-y-4">
                {task.qcReviews.map(qc => (
                  <div key={qc.id} className="p-4 rounded-lg border border-white/5 bg-background/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={qc.decision === 'approved' ? 'success' : 'destructive'} className="uppercase text-xs">
                          {qc.decision}
                        </Badge>
                        <span className="text-sm text-muted-foreground">by {qc.reviewerName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(qc.createdAt), "MMM d, yyyy HH:mm")}</span>
                    </div>
                    {qc.comments && <p className="text-sm mt-2 text-foreground/80">{qc.comments}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Time Tracking Panel */}
          {!isLocked && (
            <Card className="p-6 border-white/5 bg-card/60 backdrop-blur-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Time Tracking
              </h3>
              
              <div className="text-center mb-6 py-6 bg-background/50 rounded-xl border border-white/5">
                <div className="text-3xl font-display font-bold text-foreground">
                  {task.totalMinutes ? `${Math.floor(task.totalMinutes / 60)}h ${task.totalMinutes % 60}m` : '0h 0m'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Logged</div>
                {task.activeTimeEntry && (
                  <div className="mt-2 text-sm text-emerald-400 font-medium animate-pulse">Running currently</div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {task.status === 'assigned' || task.status === 'draft' || (!task.activeTimeEntry && task.status !== 'paused' && task.status !== 'in_progress') ? (
                  <Button onClick={handleStart} className="w-full gap-2" size="lg" disabled={startTimeMutation.isPending}>
                    <Play className="w-4 h-4" /> Start Task
                  </Button>
                ) : null}

                {task.activeTimeEntry && (
                  <Button onClick={() => setShowPauseModal(true)} variant="warning" className="w-full gap-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" size="lg" disabled={pauseTimeMutation.isPending}>
                    <Pause className="w-4 h-4" /> Pause Work
                  </Button>
                )}

                {task.status === 'paused' && !task.activeTimeEntry && (
                  <Button onClick={handleResume} className="w-full gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" size="lg" disabled={resumeTimeMutation.isPending}>
                    <Play className="w-4 h-4" /> Resume Work
                  </Button>
                )}
              </div>

              {showPauseModal && (
                <div className="mt-4 p-4 border border-white/10 rounded-lg bg-background/80 space-y-3">
                  <Label>Reason for Pause</Label>
                  <Input 
                    value={pauseReason} 
                    onChange={e => setPauseReason(e.target.value)} 
                    placeholder="e.g., waiting for parts, shift ended..."
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowPauseModal(false)}>Cancel</Button>
                    <Button onClick={handlePause} disabled={!pauseReason || pauseTimeMutation.isPending} className="flex-1">Confirm Pause</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* QC Panel */}
          {(!isLocked && ['submitted', 'under_qc'].includes(task.status)) && (
            <Card className="p-6 border-primary/30 bg-primary/5 shadow-[0_0_20px_rgba(29,78,216,0.1)]">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> QC Decision
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Review Comments</Label>
                  <Textarea 
                    placeholder="Add feedback for the technician..." 
                    value={qcComment}
                    onChange={e => setQcComment(e.target.value)}
                    className="bg-background/80"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleQcSubmit('approved')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={submitQcMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleQcSubmit('rejected')}
                    variant="destructive"
                    className="flex-1"
                    disabled={!qcComment || submitQcMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
                {!qcComment && <p className="text-xs text-muted-foreground text-center">Comment required to reject.</p>}
              </div>
            </Card>
          )}

          {isLocked && (
            <Card className="p-6 border-emerald-500/20 bg-emerald-500/5 text-center flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Task Approved</h3>
              <p className="text-sm text-muted-foreground mt-1">This task has been successfully completed and QC approved. No further modifications are allowed.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}