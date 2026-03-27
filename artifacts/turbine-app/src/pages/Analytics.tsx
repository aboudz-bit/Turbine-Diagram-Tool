/**
 * Advanced Analytics Dashboard — Enterprise KPIs, charts, and performance metrics.
 */

import * as React from "react"
import { Card, Badge } from "@/components/ui/core"
import { useLocation } from "wouter"
import {
  BarChart2, TrendingUp, AlertTriangle, Users, Clock,
  ChevronLeft, Cpu, ArrowRight, Award, Target,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts"
import { usePermissions } from "@/hooks/usePermissions"
import { useAuth } from "@/hooks/useAuth"

interface CompletionData {
  bySection: Array<{ sectionName: string; avgCompletionHours: number; taskCount: number; totalHours: number }>
  byModel: Array<{ turbineModel: string; avgCompletionHours: number; taskCount: number }>
}

interface OverdueData {
  totalTasks: number
  overdueCount: number
  overdueRate: number
  monthlyTrend: Array<{ month: string; total: number; overdueAtCreation: number }>
}

interface TechRanking {
  technicianId: number
  technicianName: string
  assignedTasks: number
  completedTasks: number
  overdueTasks: number
  totalLoggedHours: number
  avgHoursPerTask: number
  overdueRatio: number
  approvalRate: number
  performanceScore: number
}

interface TurbineBreakdown {
  turbineModel: string
  assetName: string
  totalTasks: number
  activeTasks: number
  completedTasks: number
  overdueTasks: number
}

interface FailureFrequency {
  componentId: number
  componentName: string
  stageName: string
  sectionName: string
  totalTasks: number
  rejectedTasks: number
  failureRate: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function useFetchJson<T>(url: string): { data: T | null; loading: boolean } {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    const token = localStorage.getItem('turbine_auth_token')
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [url])
  return { data, loading }
}

export default function Analytics() {
  const [, setLocation] = useLocation()
  const { canViewAnalytics } = usePermissions()

  const { data: completionData, loading: l1 } = useFetchJson<CompletionData>('/api/analytics/completion-times')
  const { data: overdueData, loading: l2 } = useFetchJson<OverdueData>('/api/analytics/overdue-rate')
  const { data: rankingData, loading: l3 } = useFetchJson<{ rankings: TechRanking[] }>('/api/analytics/technician-ranking')
  const { data: turbineData, loading: l4 } = useFetchJson<{ breakdown: TurbineBreakdown[] }>('/api/analytics/turbine-breakdown')
  const { data: failureData, loading: l5 } = useFetchJson<{ failures: FailureFrequency[] }>('/api/analytics/failure-frequency')

  const loading = l1 || l2 || l3 || l4 || l5

  if (!canViewAnalytics) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center space-y-6">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Analytics are available to engineers, supervisors, and managers.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
            Enterprise Analytics
          </p>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Completion times, overdue rates, technician rankings, and failure analysis.</p>
        </div>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-sky-600" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Overdue Rate</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{overdueData?.overdueRate ?? 0}%</p>
              <p className="text-[10px] text-muted-foreground">{overdueData?.overdueCount ?? 0} of {overdueData?.totalTasks ?? 0} tasks</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Avg Completion</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {completionData?.bySection && completionData.bySection.length > 0
                  ? Math.round(completionData.bySection.reduce((s, c) => s + c.avgCompletionHours, 0) / completionData.bySection.length * 10) / 10
                  : 0}h
              </p>
              <p className="text-[10px] text-muted-foreground">Across all sections</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Top Score</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {rankingData?.rankings?.[0]?.performanceScore ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">{rankingData?.rankings?.[0]?.technicianName ?? 'N/A'}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Failure Rate</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {failureData?.failures?.[0]?.failureRate ?? 0}%
              </p>
              <p className="text-[10px] text-muted-foreground">{failureData?.failures?.[0]?.componentName ?? 'No failures'}</p>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Avg Completion by Section */}
            <Card className="p-5">
              <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
                Avg Completion Time by Section
              </h3>
              {completionData?.bySection && completionData.bySection.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={completionData.bySection}>
                    <XAxis dataKey="sectionName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avgCompletionHours" name="Avg Hours" radius={[4, 4, 0, 0]}>
                      {completionData.bySection.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No completion data yet</p>
              )}
            </Card>

            {/* Tasks per Turbine Model (Pie) */}
            <Card className="p-5">
              <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                Tasks per Turbine Model
              </h3>
              {turbineData?.breakdown && turbineData.breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={turbineData.breakdown}
                      dataKey="totalTasks"
                      nameKey="turbineModel"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {turbineData.breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground py-8 text-center">No turbine data yet</p>
              )}
            </Card>
          </div>

          {/* Technician Rankings */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Technician Performance Ranking
            </h3>
            {rankingData?.rankings && rankingData.rankings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide">#</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide">Technician</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">Assigned</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">Completed</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">Hours</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">Approval</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">On-Time</th>
                      <th className="py-2 px-2 font-bold text-muted-foreground text-[10px] uppercase tracking-wide text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.rankings.map((tech, i) => (
                      <tr key={tech.technicianId} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-bold text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-2 font-semibold text-foreground">{tech.technicianName}</td>
                        <td className="py-2 px-2 text-center">{tech.assignedTasks}</td>
                        <td className="py-2 px-2 text-center">{tech.completedTasks}</td>
                        <td className="py-2 px-2 text-center">{tech.totalLoggedHours}h</td>
                        <td className="py-2 px-2 text-center">{tech.approvalRate}%</td>
                        <td className="py-2 px-2 text-center">{100 - tech.overdueRatio}%</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            tech.performanceScore >= 80 ? 'text-emerald-700' :
                            tech.performanceScore >= 50 ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {tech.performanceScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No performance data yet</p>
            )}
          </Card>

          {/* Failure Frequency */}
          <Card className="p-5">
            <h3 className="text-xs font-bold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Component Failure Frequency
            </h3>
            {failureData?.failures && failureData.failures.length > 0 ? (
              <div className="space-y-2">
                {failureData.failures.slice(0, 10).map((f) => (
                  <div key={f.componentId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{f.componentName}</p>
                      <p className="text-[10px] text-muted-foreground">{f.sectionName} &gt; {f.stageName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-bold ${f.rejectedTasks > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {f.rejectedTasks} / {f.totalTasks} rejected
                      </p>
                      <p className="text-[10px] text-muted-foreground">{f.failureRate}% failure rate</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No failure data yet</p>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
