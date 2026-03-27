import * as React from "react"
import { useListTasks, useUpdateTaskStatus } from "@workspace/api-client-react"
import { Card, Badge, Button, Label, Select } from "@/components/ui/core"
import { Search, Filter, RefreshCcw, CalendarClock, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

export default function Tasks() {
  const [filter, setFilter] = React.useState('all')
  const { data: tasks, isLoading, refetch } = useListTasks(filter !== 'all' ? { status: filter } : undefined)
  const [selectedTask, setSelectedTask] = React.useState<number | null>(null)
  
  const updateStatus = useUpdateTaskStatus()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned': return <Badge variant="default">Assigned</Badge>
      case 'in_progress': return <Badge variant="warning">In Progress</Badge>
      case 'submitted': return <Badge variant="purple">Submitted</Badge>
      case 'approved': return <Badge variant="success">Approved</Badge>
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>
      case 'overdue': return <Badge variant="destructive" className="bg-red-600/20 text-red-500">Overdue</Badge>
      default: return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>
    }
  }

  const handleStatusChange = async (taskId: number, newStatus: any) => {
    await updateStatus.mutateAsync({ taskId, data: { status: newStatus } })
    refetch()
    setSelectedTask(null)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
              <option value="approved">Approved</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="h-20 w-full bg-card/40 animate-pulse rounded-xl border border-white/5" />
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
                <Card className="p-0 overflow-hidden group hover:border-primary/30 transition-all cursor-pointer bg-card/40 hover:bg-card/80">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">TSK-{task.id.toString().padStart(4, '0')}</span>
                        {getStatusBadge(task.status)}
                        {task.priority === 'high' && <Badge variant="destructive" className="bg-red-500/10 text-red-400">High Priority</Badge>}
                      </div>
                      <h3 className="text-lg font-bold text-foreground/90 truncate">{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> {task.sectionName || 'Unknown Section'}</span>
                        {task.deadline && (
                          <span className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {format(new Date(task.deadline), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0">
                      {selectedTask === task.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <select 
                            className="flex-1 sm:w-32 h-9 px-3 rounded-md bg-input/80 border border-white/10 text-sm focus:ring-2 focus:ring-primary outline-none"
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Change Status...</option>
                            <option value="in_progress">In Progress</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <div className="text-right hidden sm:block mr-4">
                            <div className="text-sm font-medium text-foreground">{task.assignedToName || 'Unassigned'}</div>
                            <div className="text-xs text-muted-foreground">Assignee</div>
                          </div>
                          <Button variant="secondary" onClick={() => setSelectedTask(task.id)}>
                            Update
                          </Button>
                          <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground group-hover:text-primary transition-colors">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </>
                      )}
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
