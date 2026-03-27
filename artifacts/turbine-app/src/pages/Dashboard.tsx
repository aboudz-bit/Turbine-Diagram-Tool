import * as React from "react"
import { useListTasks, useGetDashboardStats } from "@workspace/api-client-react"
import { Card, Badge, Button } from "@/components/ui/core"
import { useLocation } from "wouter"
import {
  AlertTriangle, CheckCircle2, Clock, Activity,
  ArrowRight, ShieldCheck, Users, Zap, Timer,
  TrendingUp, ChevronRight, Cpu, BarChart2
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

function SectionHeader({ icon: Icon, label, action, onAction }: {
  icon: React.ElementType
  label: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mt-10 mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-px h-5 bg-primary/50 rounded-full" />
        <Icon className="w-4 h-4 text-primary/70" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{label}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction}
          className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-1">
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
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
    { label: 'Total Tasks',   value: computed.total,     icon: Activity,       color: 'text-sky-400',    bg: 'bg-sky-400/10',    borderAccent: '' },
    { label: 'In Progress',   value: computed.inProgress, icon: Zap,           color: 'text-amber-400',  bg: 'bg-amber-400/10',  borderAccent: computed.inProgress > 0 ? 'border-amber-500/30' : '' },
    { label: 'Pending QC',    value: computed.pendingQc, icon: ShieldCheck,    color: 'text-purple-400', bg: 'bg-purple-400/10', borderAccent: computed.pendingQc > 0 ? 'border-purple-500/30' : '' },
    { label: 'Overdue',       value: computed.overdue,   icon: AlertTriangle,  color: 'text-red-400',    bg: 'bg-red-500/10',    borderAccent: computed.overdue > 0 ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.12)]' : '', pulse: computed.overdue > 0 },
  ]

  return (
    <div className="pb-20">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-900/90 via-slate-800/40 to-slate-900/80 px-8 py-10 mb-2">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-sky-500/6 blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-48 h-48 rounded-full bg-primary/8 blur-2xl pointer-events-none" />
        <div className="absolute left-1/2 -bottom-8 w-80 h-32 rounded-full bg-emerald-500/4 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase">SGT-9000HL · Unit 1</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground/60 uppercase">Live</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
              Maintenance Operations Control
            </h1>
            <p className="text-muted-foreground/80 text-sm mt-2 max-w-lg leading-relaxed">
              Real-time monitoring, task control, and turbine maintenance insights
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-full flex-shrink-0 shadow-[0_0_16px_rgba(52,211,153,0.08)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            System Online
          </div>
        </div>
      </div>

      {/* ── CRITICAL ALERTS ── */}
      {(computed.overdue > 0 || computed.pendingQc > 0) && (
        <div className="flex flex-wrap gap-3 mt-6">
          {computed.overdue > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-red-500/12 via-red-500/7 to-transparent border border-red-500/25 rounded-xl px-5 py-3 flex-1 min-w-[240px] shadow-[0_0_24px_rgba(239,68,68,0.07)] group hover:border-red-500/40 transition-all duration-300 cursor-pointer"
              onClick={() => setLocation('/tasks')}>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300">
                  {computed.overdue} task{computed.overdue > 1 ? 's' : ''} overdue
                </p>
                <p className="text-[10px] text-red-400/60 mt-0.5">Immediate action required</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400/50 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
            </div>
          )}
          {computed.pendingQc > 0 && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/12 via-purple-500/7 to-transparent border border-purple-500/25 rounded-xl px-5 py-3 flex-1 min-w-[240px] shadow-[0_0_24px_rgba(168,85,247,0.07)] group hover:border-purple-500/40 transition-all duration-300 cursor-pointer"
              onClick={() => setLocation('/tasks')}>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-purple-300">
                  {computed.pendingQc} task{computed.pendingQc > 1 ? 's' : ''} awaiting QC review
                </p>
                <p className="text-[10px] text-purple-400/60 mt-0.5">Quality control pending</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM STATUS KPIs ── */}
      <SectionHeader icon={Cpu} label="System Status" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi, i) => (
          <Card key={i}
            className={`p-6 flex items-center gap-4 border-white/[0.06] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200 cursor-default ${kpi.borderAccent}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
              {isLoading
                ? <div className="h-8 w-10 bg-white/10 animate-pulse rounded mt-1" />
                : <p className={`text-3xl font-display font-bold mt-0.5 tracking-tight ${kpi.pulse && kpi.value > 0 ? 'text-red-400' : 'text-foreground'}`}>{kpi.value}</p>
              }
            </div>
          </Card>
        ))}
      </div>

      {/* ── ACTIVE OPERATIONS ── */}
      <SectionHeader icon={Timer} label="Active Operations" action="View all tasks" onAction={() => setLocation('/tasks')} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Work */}
        <Card className="p-0 border-white/[0.06] overflow-hidden hover:border-white/10 transition-all duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Active Work</h3>
              {computed.inProgress > 0 && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border-amber-500/20">
                  {computed.inProgress}
                </Badge>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 h-4 bg-white/10 animate-pulse rounded" />
                  </div>
                ))
              : inProgressTasks.length > 0
              ? inProgressTasks.map(task => (
                  <div key={task.id}
                    className="px-6 py-4 flex items-center gap-3 hover:bg-white/[0.025] cursor-pointer transition-colors duration-150 group"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-primary transition-colors duration-150">{task.title}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{task.sectionName || 'General'}{task.stageName ? ` › ${task.stageName}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-foreground/60">{task.assignedToName?.split(' ')[0] || '—'}</p>
                      {task.estimatedHours && (
                        <p className="text-[10px] text-muted-foreground/50">{task.estimatedHours}h est.</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors duration-150" />
                  </div>
                ))
              : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground/60">
                  No tasks currently in progress
                </div>
              )}
          </div>
          {computed.assigned > 0 && (
            <div className="px-6 py-3 bg-white/[0.015] border-t border-white/[0.04]">
              <p className="text-xs text-muted-foreground/60">
                <span className="text-amber-400 font-semibold">{computed.assigned}</span> assigned task{computed.assigned > 1 ? 's' : ''} not yet started
              </p>
            </div>
          )}
        </Card>

        {/* Requires Action */}
        <Card className="p-0 border-white/[0.06] overflow-hidden hover:border-white/10 transition-all duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Requires Action</h3>
              {(overdueTasks.length + pendingQcTasks.length) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 border-red-500/20">
                  {overdueTasks.length + pendingQcTasks.length}
                </Badge>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 h-4 bg-white/10 animate-pulse rounded" />
                  </div>
                ))
              : [...overdueTasks, ...pendingQcTasks].length > 0
              ? [...overdueTasks, ...pendingQcTasks].map(task => (
                  <div key={task.id}
                    className="px-6 py-4 flex items-center gap-3 hover:bg-white/[0.025] cursor-pointer transition-colors duration-150 group"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate group-hover:text-primary transition-colors duration-150">{task.title}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{task.sectionName || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.status === 'overdue'
                        ? <Badge variant="destructive" className="text-[10px] px-2 bg-red-500/15 text-red-400 border-red-500/20">Overdue</Badge>
                        : <Badge variant="purple" className="text-[10px] px-2 bg-purple-500/15 text-purple-400 border-purple-500/20">QC Review</Badge>}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors duration-150" />
                    </div>
                  </div>
                ))
              : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground/60">
                  No actions required
                </div>
              )}
          </div>
        </Card>
      </div>

      {/* ── ANALYTICS ── */}
      <SectionHeader icon={BarChart2} label="Analytics & Workforce" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Section Chart */}
        <Card className="lg:col-span-2 p-6 border-white/[0.06] hover:border-white/10 transition-all duration-200">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Tasks by Section</h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Distribution across turbine sections</p>
            </div>
          </div>
          <div className="h-44">
            {statsLoading
              ? <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse flex gap-3 items-end">
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
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {sectionChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              : <div className="flex items-center justify-center h-full text-sm text-muted-foreground/50">No data</div>
            }
          </div>
        </Card>

        {/* Technician Workload */}
        <Card className="lg:col-span-3 border-white/[0.06] overflow-hidden hover:border-white/10 transition-all duration-200">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Technician Workload</h3>
              <p className="text-[10px] text-muted-foreground/60">Field crew assignment status</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.025]">
                  <th className="px-6 py-3 text-left text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Technician</th>
                  <th className="px-4 py-3 text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Assigned</th>
                  <th className="px-4 py-3 text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Done</th>
                  <th className="px-6 py-3 text-right text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-white/10 animate-pulse rounded" /></td>
                        <td className="px-4 py-4 text-center"><div className="h-4 w-6 bg-white/10 animate-pulse rounded mx-auto" /></td>
                        <td className="px-4 py-4 text-center"><div className="h-4 w-6 bg-white/10 animate-pulse rounded mx-auto" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-white/10 animate-pulse rounded ml-auto" /></td>
                      </tr>
                    ))
                  : stats?.technicianPerformance?.length
                  ? stats.technicianPerformance.map((tech, i) => (
                      <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.025] transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 border border-primary/15">
                              {tech.technicianName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium text-foreground/85 text-sm">{tech.technicianName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-foreground/80">{tech.assignedTasks}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-semibold ${tech.completedTasks > 0 ? 'text-emerald-400' : 'text-muted-foreground/40'}`}>
                            {tech.completedTasks}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground/60 text-sm font-medium">
                          {tech.avgCompletionHours ? `${tech.avgCompletionHours.toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground/50">
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
