import * as React from "react"
import { useListTasks } from "@workspace/api-client-react"
import { Card } from "@/components/ui/core"
import { TurbineDiagram } from "@/components/TurbineDiagram"
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function Dashboard() {
  // Using query hook. In a real app we'd pass proper error boundaries
  const { data: tasks, isLoading } = useListTasks()
  
  const stats = React.useMemo(() => {
    if (!tasks) return { total: 0, pending: 0, completed: 0, overdue: 0 }
    return {
      total: tasks.length,
      pending: tasks.filter(t => ['draft', 'assigned', 'in_progress', 'paused'].includes(t.status)).length,
      completed: tasks.filter(t => ['approved', 'submitted'].includes(t.status)).length,
      overdue: tasks.filter(t => t.status === 'overdue').length
    }
  }, [tasks])

  const chartData = [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Completed', value: stats.completed, color: '#34d399' },
    { name: 'Overdue', value: stats.overdue, color: '#ef4444' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-foreground">Turbine Overview</h1>
        <p className="text-muted-foreground text-sm">Real-time status and quick metrics for your gas turbine fleet.</p>
      </div>

      {/* Embedded Non-interactive Turbine Diagram to show visual flair */}
      <Card className="p-6 bg-card/60 border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <span className="font-display font-bold tracking-wider text-sm text-foreground/80">LIVE ASSET VIEW</span>
        </div>
        <div className="pt-8">
          <TurbineDiagram interactive={false} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tasks", value: stats.total, icon: Activity, color: "text-primary" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Overdue Alerts", value: stats.overdue, icon: AlertCircle, color: "text-red-500" }
        ].map((stat, i) => (
          <Card key={i} className="p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors border-white/5">
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-white/10 animate-pulse rounded mt-1" />
              ) : (
                <h3 className="text-2xl font-display font-bold mt-0.5">{stat.value}</h3>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 p-6 border-white/5">
          <h3 className="text-lg font-display font-bold mb-6">Task Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-1 p-6 border-white/5 flex flex-col">
          <h3 className="text-lg font-display font-bold mb-4">Recent Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {isLoading ? (
              Array.from({length: 4}).map((_, i) => (
                <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-lg" />
              ))
            ) : tasks?.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer">
                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${task.status === 'overdue' ? 'bg-red-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground/90">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.sectionName || 'General'} - {task.status}</p>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-sm text-muted-foreground">No recent tasks</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
