import * as React from "react"
import { useListTasks, useGetDashboardStats } from "@workspace/api-client-react"
import { Card, Badge } from "@/components/ui/core"
import { useLocation } from "wouter"
import {
  AlertTriangle, CheckCircle2, Clock, Activity,
  ArrowRight, ShieldCheck, Users, Zap, Timer,
  TrendingUp, ChevronRight, Cpu, BarChart2, History,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { formatDistanceToNow } from "date-fns"

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_progress: 'bg-sky-500',
    overdue: 'bg-red-500',
    submitted: 'bg-purple-500',
    under_qc: 'bg-purple-500',
    approved: 'bg-emerald-500',
    assigned: 'bg-amber-500',
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
    <div className="flex items-center justify-between mt-10 mb-5">
      <div className="flex items-center gap-2.5">
        <div className="w-px h-5 bg-primary rounded-full" />
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/60">{label}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction}
          className="text-xs text-muted-foreground hover:text-primary transition-colors duration-150 flex items-center gap-1">
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { data: taskResponse, isLoading } = useListTasks()
  const tasks = taskResponse?.data
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
    color: s.sectionName === 'Compressor' ? '#0284c7'
      : s.sectionName === 'Mid Frame' ? '#d97706'
      : s.sectionName === 'Turbine' ? '#059669'
      : '#7c3aed'
  })) || []

  const loggedHoursDisplay = stats?.totalLoggedHours != null
    ? `${stats.totalLoggedHours.toFixed(1)}h`
    : '—'

  const KPIS = [
    { label: 'Total Tasks',    value: computed.total,                    icon: Activity,       color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200' },
    { label: 'In Progress',    value: computed.inProgress,               icon: Zap,            color: 'text-amber-600',  bg: 'bg-amber-50',  border: computed.inProgress > 0 ? 'border-amber-300' : 'border-border' },
    { label: 'Pending QC',     value: computed.pendingQc,                icon: ShieldCheck,    color: 'text-purple-600', bg: 'bg-purple-50', border: computed.pendingQc > 0 ? 'border-purple-300' : 'border-border' },
    { label: 'Overdue',        value: computed.overdue,                  icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50',    border: computed.overdue > 0 ? 'border-red-300' : 'border-border', pulse: computed.overdue > 0 },
    { label: 'Hours Logged',   value: loggedHoursDisplay,                icon: Clock,          color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200', isString: true },
    { label: 'Active Sessions',value: stats?.activeSessionCount ?? 0,    icon: Timer,          color: 'text-sky-600',    bg: 'bg-sky-50',    border: (stats?.activeSessionCount ?? 0) > 0 ? 'border-sky-300' : 'border-border', pulse: (stats?.activeSessionCount ?? 0) > 0 },
  ]

  return (
    <div className="pb-20">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-50 via-white to-slate-50 px-8 py-10 mb-2 shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 w-48 h-48 rounded-full bg-sky-400/8 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">SGT-9000HL · Unit 1</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">Live</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight leading-tight">
              Maintenance Operations Control
            </h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg leading-relaxed">
              Real-time monitoring, task control, and turbine maintenance insights
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-full flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            System Online
          </div>
        </div>
      </div>

      {/* ── CRITICAL ALERTS ── */}
      {(computed.overdue > 0 || computed.pendingQc > 0) && (
        <div className="flex flex-wrap gap-3 mt-6">
          {computed.overdue > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex-1 min-w-[240px] group hover:border-red-300 hover:bg-red-50/80 transition-all duration-200 cursor-pointer"
              onClick={() => setLocation('/tasks')}>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  {computed.overdue} task{computed.overdue > 1 ? 's' : ''} overdue
                </p>
                <p className="text-[11px] text-red-500 mt-0.5">Immediate action required</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
            </div>
          )}
          {computed.pendingQc > 0 && (
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-3.5 flex-1 min-w-[240px] group hover:border-purple-300 hover:bg-purple-50/80 transition-all duration-200 cursor-pointer"
              onClick={() => setLocation('/tasks')}>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-purple-700">
                  {computed.pendingQc} task{computed.pendingQc > 1 ? 's' : ''} awaiting QC review
                </p>
                <p className="text-[11px] text-purple-500 mt-0.5">Quality control pending</p>
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM STATUS KPIs ── */}
      <SectionHeader icon={Cpu} label="System Status" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPIS.map((kpi, i) => (
          <Card key={i}
            className={`p-5 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 cursor-default ${kpi.border}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bg} border border-current/10`}>
              <kpi.icon className={`w-4.5 h-4.5 ${kpi.color} w-5 h-5`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-tight">{kpi.label}</p>
              {(isLoading || (kpi.isString ? statsLoading : false))
                ? <div className="h-7 w-10 bg-muted animate-pulse rounded mt-1" />
                : <p className={`text-2xl font-display font-bold mt-0.5 tracking-tight ${
                    'pulse' in kpi && kpi.pulse
                      ? (kpi.label === 'Overdue' ? 'text-red-600' : 'text-sky-600')
                      : 'text-foreground'
                  }`}>
                    {kpi.isString ? kpi.value : kpi.value}
                  </p>
              }
            </div>
          </Card>
        ))}
      </div>

      {/* ── ACTIVE OPERATIONS ── */}
      <SectionHeader icon={Timer} label="Active Operations" action="View all tasks" onAction={() => setLocation('/tasks')} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Work */}
        <Card className="p-0 overflow-hidden hover:shadow-md transition-all duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Active Work</h3>
              {computed.inProgress > 0 && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                  {computed.inProgress}
                </Badge>
              )}
            </div>
          </div>
          <div className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                  </div>
                ))
              : inProgressTasks.length > 0
              ? inProgressTasks.map(task => (
                  <div key={task.id}
                    className="px-6 py-4 flex items-center gap-3 hover:bg-muted/40 cursor-pointer transition-colors duration-150 group"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-150">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.sectionName || 'General'}{task.stageName ? ` › ${task.stageName}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-foreground/70">{task.assignedToName?.split(' ')[0] || '—'}</p>
                      {task.estimatedHours && (
                        <p className="text-[10px] text-muted-foreground">{task.estimatedHours}h est.</p>
                      )}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-150" />
                  </div>
                ))
              : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No tasks currently in progress
                </div>
              )}
          </div>
          {computed.assigned > 0 && (
            <div className="px-6 py-3 bg-muted/30 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="text-amber-600 font-semibold">{computed.assigned}</span> assigned task{computed.assigned > 1 ? 's' : ''} not yet started
              </p>
            </div>
          )}
        </Card>

        {/* Requires Action */}
        <Card className="p-0 overflow-hidden hover:shadow-md transition-all duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Requires Action</h3>
              {(overdueTasks.length + pendingQcTasks.length) > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                  {overdueTasks.length + pendingQcTasks.length}
                </Badge>
              )}
            </div>
          </div>
          <div className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                  </div>
                ))
              : [...overdueTasks, ...pendingQcTasks].length > 0
              ? [...overdueTasks, ...pendingQcTasks].map(task => (
                  <div key={task.id}
                    className="px-6 py-4 flex items-center gap-3 hover:bg-muted/40 cursor-pointer transition-colors duration-150 group"
                    onClick={() => setLocation(`/tasks/${task.id}`)}>
                    <PriorityStripe priority={task.priority} />
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-150">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.sectionName || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.status === 'overdue'
                        ? <Badge variant="destructive" className="text-[10px] px-2">Overdue</Badge>
                        : <Badge variant="purple" className="text-[10px] px-2">QC Review</Badge>}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-150" />
                    </div>
                  </div>
                ))
              : (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No actions required
                </div>
              )}
          </div>
        </Card>
      </div>

      {/* ── ANALYTICS ── */}
      <SectionHeader icon={BarChart2} label="Analytics & Workforce" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-5">
        {/* Section Chart */}
        <Card className="lg:col-span-2 p-6 hover:shadow-md transition-all duration-150">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Tasks by Section</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Distribution across turbine sections</p>
            </div>
          </div>
          <div className="h-44">
            {statsLoading
              ? <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse flex gap-3 items-end">
                    {[60, 90, 50, 70].map((h, i) => (
                      <div key={i} className="w-8 bg-muted rounded-t" style={{ height: h }} />
                    ))}
                  </div>
                </div>
              : sectionChartData && sectionChartData.length > 0
              ? <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionChartData} margin={{ top: 5, right: 5, left: -28, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
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

        {/* Technician Workload */}
        <Card className="lg:col-span-3 overflow-hidden hover:shadow-md transition-all duration-150">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Technician Workload</h3>
              <p className="text-[10px] text-muted-foreground">Field crew assignment status</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-6 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Technician</th>
                  <th className="px-4 py-3 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Assigned</th>
                  <th className="px-4 py-3 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Done</th>
                  <th className="px-6 py-3 text-right text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-6 py-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                        <td className="px-4 py-4 text-center"><div className="h-4 w-6 bg-muted animate-pulse rounded mx-auto" /></td>
                        <td className="px-4 py-4 text-center"><div className="h-4 w-6 bg-muted animate-pulse rounded mx-auto" /></td>
                        <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></td>
                      </tr>
                    ))
                  : stats?.technicianPerformance?.length
                  ? stats.technicianPerformance.map((tech, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 border border-primary/20">
                              {tech.technicianName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium text-foreground text-sm">{tech.technicianName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-foreground">{tech.assignedTasks}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-semibold ${tech.completedTasks > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {tech.completedTasks}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-muted-foreground text-sm font-medium">
                          {tech.avgCompletionHours ? `${tech.avgCompletionHours.toFixed(1)}h` : '—'}
                        </td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No technician data available
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── TURBINE DISTRIBUTION + RECENT ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* By-turbine pie */}
        <Card className="lg:col-span-2 p-6 hover:shadow-md transition-all duration-150">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">By Turbine Unit</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Task distribution per asset</p>
            </div>
          </div>
          {statsLoading ? (
            <div className="h-44 flex items-center justify-center">
              <div className="animate-pulse flex gap-3 items-end">
                {[60, 90, 50].map((h, i) => (
                  <div key={i} className="w-8 bg-muted rounded-t" style={{ height: h }} />
                ))}
              </div>
            </div>
          ) : stats?.byTurbine && stats.byTurbine.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byTurbine.map((t, i) => ({
                      name: t.assetName,
                      value: t.count,
                      fill: i === 0 ? '#0284c7' : i === 1 ? '#7c3aed' : '#059669',
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.byTurbine.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#0284c7' : i === 1 ? '#7c3aed' : '#059669'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
        </Card>

        {/* Recent Activity feed */}
        <Card className="lg:col-span-3 p-0 overflow-hidden hover:shadow-md transition-all duration-150">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <History className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Recent Activity</h3>
              <p className="text-[10px] text-muted-foreground">Latest system events</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-start gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-2.5 w-1/2 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 8).map((entry) => (
                <div key={entry.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                  <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground font-medium leading-snug">
                      {entry.actionLabel}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.actorName}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
