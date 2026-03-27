import * as React from "react"
import { useListTasks, useGetDashboardStats } from "@workspace/api-client-react"
import { Card, Badge, Button } from "@/components/ui/core"
import { useLocation } from "wouter"
import {
  AlertTriangle, CheckCircle2, Clock, Activity,
  ArrowRight, ShieldCheck, Users, Zap, Timer,
  TrendingUp, ChevronRight
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_progress: 'bg-sky-400',
    overdue: 'bg-red-500',
    submitted: 'bg-purple-400',
    under_qc: 'bg-purple-400',
    approved: 'bg-emerald-500',
    assigned: 'bg-amber-400',
    paused: 'bg-slate-400',
  }
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-slate-400'}`} />
}

function PriorityStripe({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-500' }
  return <span className={`w-1 self-stretch rounded-full flex-shrink-0 ${colors[priority] || 'bg-transparent'}`} />
}

export default function Dashboard() {
  const { data: tasks, isLoading } = useListTasks()
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats()
  const [, setLocation] = useLocation()

  const computed = React.useMemo(() => {
    if (!tasks) return { total: 0, inProgress: 0, overdue: 0, pendingQc: 0, assigned: 0 }
    return {
      total: tasks.length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      overdue: tasks.filter(t => t.status === 'overdue').length,
      pendingQc: tasks.filter(t => ['submitted', 'under_qc'].includes(t.status)).length,
      assigned: tasks.filter(t => t.status === 'assigned').length,
    }
  }, [tasks])

  const overdueTasks = tasks?.filter(t => t.status === 'overdue') || []
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
  const pendingQcTasks = tasks?.filter(t => ['submitted', 'under_qc'].includes(t.status)) || []

  const sectionChartData = stats?.bySection?.map(s => ({
    name: s.sectionName?.split(' ')[0] || 'General',
    count: s.count,
    color: s.sectionName === 'Compressor' ? '#38bdf8'
      : s.sectionName === 'Mid Frame' ? '#f59e0b'
      : s.sectionName === 'Turbine' ? '#34d399'
      : '#a78bfa'
  })) || []

  const KPIS = [
    {
      label: 'Total Tasks',
      value: computed.total,
      icon: Activity,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      border: '',
    },
    {
      label: 'In Progress',
      value: computed.inProgress,
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: computed.inProgress > 0 ? 'border-amber-500/30' : '',
    },
    {
      label: 'Pending QC',
      value: computed.pendingQc,
      icon: ShieldCheck,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: computed.pendingQc > 0 ? 'border-purple-500/30' : '',
    },
    {
      label: 'Overdue',
      value: computed.overdue,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: computed.overdue > 0 ? 'border-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.18)]' : '',
      pulse: computed.overdue > 0,
    },
  ]

  return (
    <div className="space-y-5 pb-16">
      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-muted-foreground text-xs mt-0.5">SGT-9000HL — Live maintenance status</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System Online
        </div>
      </div>

      {/* ── ALERT STRIP (overdue/qc) ── */}
      {(computed.overdue > 0 || computed.pendingQc > 0) && (
        <div className="flex flex-wrap gap-3">
          {computed.overdue > 0 && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />
              <span className="text-sm font-semibold text-red-300">
                {computed.overdue} task{computed.overdue > 1 ? 's' : ''} overdue — immediate action required
              </span>
              <Button variant="ghost" size="icon"
                className="ml-auto h-6 w-6 text-red-400 hover:bg-red-500/20"
                onClick={() => setLocation('/tasks')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          {computed.pendingQc > 0 && (
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
              <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-purple-300">
                {computed.pendingQc} task{computed.pendingQc > 1 ? 's' : ''} awaiting QC review
              </span>
              <Button variant="ghost" size="icon"
                className="ml-auto h-6 w-6 text-purple-400 hover:bg-purple-500/20"
                onClick={() => setLocation('/tasks')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((kpi, i) => (
          <Card key={i}
            className={`p-4 flex items-center gap-3 border-white/5 ${kpi.border} ${kpi.pulse ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              {isLoading
                ? <div className="h-7 w-10 bg-white/10 animate-pulse rounded mt-0.5" />
                : <p className={`text-2xl font-display font-bold mt-0.5 ${kpi.value > 0 && kpi.pulse ? 'text-red-400' : ''}`}>{kpi.value}</p>
              }
            </div>
          </Card>
        ))}
      </div>

      {/* ── ACTIVE WORK + REQUIRES ACTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Work */}
        <Card className="p-0 border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-foreground">Active Work</h3>
              {computed.inProgress > 0 && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-transparent">
                  {computed.inProgress}
                </Badge>
              )}
            </div>
            <button onClick={() => setLocation('/tasks')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 h-4 bg-white/10 animate-pulse rounded" />
                  </div>
                ))
              : inProgressTasks.length > 0
              ? inProgressTasks.map(task => (
                  <div key={task.id}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.sectionName || 'General'}{task.stageName ? ` › ${task.stageName}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-foreground/70">{task.assignedToName?.split(' ')[0] || '—'}</p>
                      {task.estimatedHours && (
                        <p className="text-[10px] text-muted-foreground">{task.estimatedHours}h est.</p>
                      )}
                    </div>
                  </div>
                ))
              : (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No tasks currently in progress
                </div>
              )}
          </div>
          {computed.assigned > 0 && (
            <div className="px-5 py-2.5 bg-white/[0.02] border-t border-white/5">
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-400 font-semibold">{computed.assigned}</span> assigned task{computed.assigned > 1 ? 's' : ''} not yet started
              </p>
            </div>
          )}
        </Card>

        {/* Requires Action */}
        <Card className="p-0 border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-sm text-foreground">Requires Action</h3>
              {(overdueTasks.length + pendingQcTasks.length) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-transparent">
                  {overdueTasks.length + pendingQcTasks.length}
                </Badge>
              )}
            </div>
            <button onClick={() => setLocation('/tasks')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 h-4 bg-white/10 animate-pulse rounded" />
                  </div>
                ))
              : [...overdueTasks, ...pendingQcTasks].length > 0
              ? [...overdueTasks, ...pendingQcTasks].map(task => (
                  <div key={task.id}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.sectionName || 'General'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {task.status === 'overdue'
                        ? <Badge variant="destructive" className="text-[10px] bg-red-500/20 text-red-400 border-transparent">Overdue</Badge>
                        : <Badge variant="purple" className="text-[10px] bg-purple-500/20 text-purple-400 border-transparent">QC Review</Badge>}
                    </div>
                  </div>
                ))
              : (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No actions required
                </div>
              )}
          </div>
        </Card>
      </div>

      {/* ── TASKS BY SECTION CHART + TECHNICIAN TABLE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Section Chart */}
        <Card className="lg:col-span-2 p-5 border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Tasks by Section</h3>
          </div>
          <div className="h-44">
            {statsLoading
              ? <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse flex gap-2 items-end">
                    {[60, 90, 50, 70].map((h, i) => (
                      <div key={i} className="w-8 bg-white/10 rounded-t" style={{ height: h }} />
                    ))}
                  </div>
                </div>
              : sectionChartData.length > 0
              ? <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionChartData} margin={{ top: 5, right: 5, left: -28, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {sectionChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
            }
          </div>
        </Card>

        {/* Technician Workload Table */}
        <Card className="lg:col-span-3 border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Technician Workload</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-5 py-2.5 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Technician</th>
                  <th className="px-4 py-2.5 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Assigned</th>
                  <th className="px-4 py-2.5 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Done</th>
                  <th className="px-4 py-2.5 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-5 py-3">
                          <div className="h-4 w-28 bg-white/10 animate-pulse rounded" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 w-6 bg-white/10 animate-pulse rounded mx-auto" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 w-6 bg-white/10 animate-pulse rounded mx-auto" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="h-4 w-12 bg-white/10 animate-pulse rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  : stats?.technicianPerformance?.length
                  ? stats.technicianPerformance.map((tech, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                              {tech.technicianName?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                            </div>
                            <span className="font-medium text-foreground/90 text-sm">{tech.technicianName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium">{tech.assignedTasks}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm font-medium ${tech.completedTasks > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {tech.completedTasks}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                          {tech.avgCompletionHours ? `${tech.avgCompletionHours.toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No technician data available
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
