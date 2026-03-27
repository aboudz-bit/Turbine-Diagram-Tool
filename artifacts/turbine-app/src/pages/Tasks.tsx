import * as React from "react"
import { useListTasks } from "@workspace/api-client-react"
import { Card, Badge, Button } from "@/components/ui/core"
import { Filter, RefreshCcw, CalendarClock, ChevronRight, ListTodo, User, Clock } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "wouter"

export default function Tasks() {
  const [filter, setFilter] = React.useState('all')
  const { data: tasks, isLoading, refetch } = useListTasks(filter !== 'all' ? { status: filter } : undefined)
  const [, setLocation] = useLocation()
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned': return <Badge variant="default">Assigned</Badge>
      case 'in_progress': return <Badge variant="warning" className="bg-amber-500/20 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" /> In Progress</Badge>
      case 'submitted': return <Badge variant="purple" className="bg-purple-500/20 text-purple-400">Submitted</Badge>
      case 'under_qc': return <Badge variant="purple" className="bg-purple-500/20 text-purple-400">Under QC</Badge>
      case 'approved': return <Badge variant="success" className="bg-emerald-500/20 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" /> Approved</Badge>
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>
      case 'overdue': return <Badge variant="destructive" className="bg-red-600/20 text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" /> Overdue</Badge>
      case 'paused': return <Badge variant="secondary"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" /> Paused</Badge>
      default: return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Task Library</h1>
          <p className="text-muted-foreground text-sm">Manage and track maintenance tasks across all sections.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 pl-9 pr-4 rounded-lg border border-white/10 bg-input/50 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none text-foreground w-40"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="under_qc">Under QC</option>
              <option value="approved">Approved</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="h-24 w-full bg-card/40 animate-pulse rounded-xl border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {tasks?.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card 
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                  className="p-0 overflow-hidden group hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(29,78,216,0.15)] transition-all cursor-pointer bg-card/40 hover:bg-card/80 relative"
                >
                  {/* Priority Stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(task.priority)}`} />
                  
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 pl-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">TSK-{task.id.toString().padStart(4, '0')}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      <h3 className="text-lg font-bold text-foreground/90 truncate group-hover:text-primary transition-colors">{task.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium text-foreground/70">
                          {task.sectionName || 'General'}
                          {task.componentName && (
                            <>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" /> 
                              {task.stageName && <>{task.stageName} <ChevronRight className="w-3 h-3 text-muted-foreground" /></>}
                              <span className="text-primary/80">{task.componentName}</span>
                            </>
                          )}
                        </span>
                        
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                            <Clock className="h-3.5 w-3.5" />
                            {task.estimatedHours}h est.
                          </span>
                        )}
                        
                        {task.deadline && (
                          <span className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {format(new Date(task.deadline), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0">
                      <div className="flex items-center gap-3 mr-4">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                          {task.assignedToName ? (
                            <span className="text-xs font-bold text-foreground">{task.assignedToName.substring(0, 2).toUpperCase()}</span>
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="hidden sm:block">
                          <div className="text-sm font-medium text-foreground">{task.assignedToName || 'Unassigned'}</div>
                          <div className="text-xs text-muted-foreground">Assignee</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors rounded-full">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks?.length === 0 && (
            <div className="text-center py-16 px-4 bg-card/30 rounded-xl border border-white/5 border-dashed">
              <ListTodo className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No tasks found</h3>
              <p className="text-muted-foreground mt-1">There are no tasks matching your current filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}