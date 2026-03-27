import * as React from "react"
import { useListTasks } from "@workspace/api-client-react"
import { Card, Badge, Button } from "@/components/ui/core"
import { Filter, RefreshCcw, CalendarClock, ChevronRight, ListTodo, User, Clock, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "wouter"

export default function Tasks() {
  const [filter, setFilter] = React.useState('all')
  const { data: tasks, isLoading, refetch } = useListTasks(filter !== 'all' ? { status: filter } : undefined)
  const [, setLocation] = useLocation()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-500/15 text-slate-300 border-slate-500/20">Assigned</Badge>
      case 'in_progress':
        return <Badge variant="warning" className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-400 border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse inline-block" />In Progress
        </Badge>
      case 'submitted':
        return <Badge variant="purple" className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-400 border-purple-500/20">Submitted</Badge>
      case 'under_qc':
        return <Badge variant="purple" className="text-[10px] px-2 py-0.5 bg-purple-500/15 text-purple-400 border-purple-500/20">Under QC</Badge>
      case 'approved':
        return <Badge variant="success" className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />Approved
        </Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px] px-2 py-0.5 bg-red-500/15 text-red-400 border-red-500/20">Rejected</Badge>
      case 'overdue':
        return <Badge variant="destructive" className="text-[10px] px-2 py-0.5 bg-red-600/15 text-red-400 border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 inline-block" />Overdue
        </Badge>
      case 'paused':
        return <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-500/15 text-slate-400 border-slate-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 inline-block" />Paused
        </Badge>
      default:
        return <Badge variant="secondary" className="text-[10px] capitalize">{status.replace('_', ' ')}</Badge>
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-transparent'
    }
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_qc', label: 'Under QC' },
    { value: 'approved', label: 'Approved' },
    { value: 'overdue', label: 'Overdue' },
  ]

  return (
    <div className="max-w-5xl mx-auto pb-16">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 mb-8">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">SGT-9000HL · Maintenance Log</p>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Task Registry</h1>
          <p className="text-muted-foreground/60 text-sm mt-1">All maintenance tasks across turbine sections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"
            onClick={() => refetch()}
            className="h-9 w-9 border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={() => setLocation('/create-task')}
            className="h-9 px-4 text-xs font-semibold gap-1.5">
            New Task <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── STATUS FILTER TABS ── */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6 p-1 bg-white/[0.025] rounded-xl border border-white/[0.06]">
        <Filter className="w-3.5 h-3.5 text-muted-foreground/40 ml-2 flex-shrink-0" />
        {FILTERS.map(f => (
          <button key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              filter === f.value
                ? 'bg-primary/15 text-primary border border-primary/25 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                : 'text-muted-foreground/60 hover:text-foreground/80 hover:bg-white/[0.04]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── TASK LIST ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 w-full bg-card/30 animate-pulse rounded-xl border border-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {tasks?.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              >
                <Card
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                  className="p-0 overflow-hidden group cursor-pointer border-white/[0.06] bg-card/40 hover:bg-card/70 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 relative"
                >
                  {/* Priority stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${getPriorityColor(task.priority)}`} />

                  <div className="p-5 pl-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-muted-foreground/50 tracking-wider">
                          TSK-{task.id.toString().padStart(4, '0')}
                        </span>
                        {getStatusBadge(task.status)}
                      </div>
                      <h3 className="text-base font-semibold text-foreground/90 truncate group-hover:text-primary transition-colors duration-200">
                        {task.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-muted-foreground/60">
                        <span className="font-medium text-foreground/50">
                          {task.sectionName || 'General'}
                          {task.stageName && <span className="text-muted-foreground/40"> › {task.stageName}</span>}
                          {task.componentName && <span className="text-primary/60"> › {task.componentName}</span>}
                        </span>
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1 border-l border-white/[0.08] pl-4">
                            <Clock className="h-3 w-3" />
                            {task.estimatedHours}h
                          </span>
                        )}
                        {task.deadline && (
                          <span className="flex items-center gap-1 border-l border-white/[0.08] pl-4">
                            <CalendarClock className="h-3 w-3" />
                            {format(new Date(task.deadline), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t border-white/[0.04] sm:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                          {task.assignedToName
                            ? <span className="text-[10px] font-bold text-primary">{task.assignedToName.substring(0, 2).toUpperCase()}</span>
                            : <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                          }
                        </div>
                        <div className="hidden sm:block">
                          <div className="text-xs font-semibold text-foreground/70">{task.assignedToName || 'Unassigned'}</div>
                          <div className="text-[10px] text-muted-foreground/40">Assignee</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all duration-200 ml-2" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks?.length === 0 && (
            <div className="text-center py-20 px-4 bg-card/20 rounded-2xl border border-white/[0.04] border-dashed">
              <ListTodo className="h-10 w-10 text-muted-foreground/25 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-foreground/70">No tasks found</h3>
              <p className="text-muted-foreground/50 text-sm mt-1">No tasks match your current filter selection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
