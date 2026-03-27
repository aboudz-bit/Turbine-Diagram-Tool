import * as React from "react"
import { useListAssets, useListSections, useListStages, useListComponents, useGetComponentHistory } from "@workspace/api-client-react"
import { Card, Badge } from "@/components/ui/core"
import { Wrench, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, TrendingUp, Layers } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation, useSearch } from "wouter"
import { cn } from "@/lib/utils"

const SECTION_COLORS: Record<string, { color: string; bg: string; border: string; activeBg: string }> = {
  'Compressor':           { color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-300',    activeBg: 'bg-sky-50' },
  'Mid Frame':            { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300',  activeBg: 'bg-amber-50' },
  'Turbine':              { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300',activeBg: 'bg-emerald-50' },
  'Turbine Exit Cylinder':{ color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300', activeBg: 'bg-purple-50' },
}

function getSectionStyle(name?: string) {
  if (!name) return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', activeBg: 'bg-primary/5' }
  return SECTION_COLORS[name] || { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', activeBg: 'bg-primary/5' }
}

export default function AssetHistory() {
  const { data: assets } = useListAssets()
  const defaultAsset = assets?.[0]
  const [, setLocation] = useLocation()
  const searchStr = useSearch()
  const searchParams = React.useMemo(() => new URLSearchParams(searchStr), [searchStr])

  const { data: sections } = useListSections(defaultAsset?.id ?? 0, {
    query: { enabled: !!defaultAsset?.id }
  })

  const initSectionId = searchParams.get('sectionId') ? parseInt(searchParams.get('sectionId')!) : null
  const [activeSectionId, setActiveSectionId] = React.useState<number | null>(initSectionId)
  React.useEffect(() => {
    if (sections?.length && !activeSectionId) setActiveSectionId(sections[0].id)
  }, [sections, activeSectionId])

  const activeSection = sections?.find(s => s.id === activeSectionId)
  const sectionStyle = getSectionStyle(activeSection?.name)

  const { data: stages } = useListStages(activeSectionId ?? 0, {
    query: { enabled: !!activeSectionId }
  })

  const [activeStageId, setActiveStageId] = React.useState<number | null>(null)
  React.useEffect(() => {
    if (stages && stages.length > 0) {
      setActiveStageId(stages[0].id)
    } else if (stages && stages.length === 0) {
      setActiveStageId(null)
    }
  }, [stages])

  const { data: components } = useListComponents(activeStageId ?? 0, {
    query: { enabled: !!activeStageId }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
            {defaultAsset?.name || 'SGT-9000HL'} · Maintenance Record
          </p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Asset History
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Component-level maintenance record, fault tracking & task history
          </p>
        </div>
      </div>

      {/* ── SECTION TABS ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {sections?.map(section => {
          const style = getSectionStyle(section.name)
          const isActive = activeSectionId === section.id
          return (
            <button
              key={section.id}
              onClick={() => { setActiveSectionId(section.id) }}
              className={cn(
                "whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 border",
                isActive
                  ? `${style.activeBg} ${style.border} ${style.color} shadow-sm`
                  : "bg-white border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {section.name}
            </button>
          )
        })}
      </div>

      {/* ── STAGE SUB-TABS ── */}
      {stages && stages.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-1">Stage</span>
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setActiveStageId(stage.id)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 border",
                activeStageId === stage.id
                  ? "bg-white border-border text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-white hover:text-foreground hover:border-border"
              )}
            >
              {stage.name}
              {stage.bladeCountMin != null && stage.bladeCountMax != null && (
                <span className={cn("ml-1.5 text-[10px]", activeStageId === stage.id ? "text-muted-foreground" : "text-muted-foreground/60")}>
                  ({stage.bladeCountMin}–{stage.bladeCountMax})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── COMPONENT GRID ── */}
      {!activeStageId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {components?.map(comp => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <ComponentCard
                  componentId={comp.id}
                  componentName={comp.name}
                  sectionStyle={sectionStyle}
                  onTaskClick={(taskId) => setLocation(`/tasks/${taskId}`)}
                />
              </motion.div>
            ))}
            {components?.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground border border-border border-dashed rounded-xl bg-white">
                No components in this stage
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function ComponentCard({
  componentId, componentName, sectionStyle, onTaskClick
}: {
  componentId: number
  componentName: string
  sectionStyle: { color: string; bg: string; border: string }
  onTaskClick: (taskId: number) => void
}) {
  const { data: history, isLoading } = useGetComponentHistory(componentId)
  const [expanded, setExpanded] = React.useState(false)

  if (isLoading) {
    return (
      <Card className="h-40 animate-pulse bg-muted border-border" />
    )
  }

  const openTasks = history?.tasks?.filter(t => !['approved'].includes(t.status)) || []
  const hasOpenTasks = openTasks.length > 0
  const lastMaint = history?.lastMaintenanceDate ? new Date(history.lastMaintenanceDate) : null
  const recentMaint = lastMaint && (Date.now() - lastMaint.getTime()) < 30 * 24 * 60 * 60 * 1000

  return (
    <Card className={cn(
      "border overflow-hidden transition-all duration-150 hover:shadow-md",
      hasOpenTasks ? "border-amber-300" : recentMaint ? "border-emerald-300" : "border-border"
    )}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => history?.tasks?.length && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", sectionStyle.bg, "border", sectionStyle.border)}>
              <Wrench className={`w-4 h-4 ${sectionStyle.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{componentName}</h3>
              {hasOpenTasks && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] text-amber-600 font-medium">{openTasks.length} open task{openTasks.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          {history?.tasks && history.tasks.length > 0 && (
            <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2 border border-border">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Layers className="w-2.5 h-2.5" /> Total
            </div>
            <div className="font-bold text-sm text-foreground">{history?.totalTasks || 0}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border border-border">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Avg
            </div>
            <div className="font-bold text-sm text-foreground">
              {history?.avgRepairHours ? `${history.avgRepairHours.toFixed(0)}h` : 'N/A'}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border border-border">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> Open
            </div>
            <div className={cn("font-bold text-sm", hasOpenTasks ? "text-amber-600" : "text-foreground")}>
              {openTasks.length}
            </div>
          </div>
        </div>

        {/* Last maintenance */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs">
          <span className="text-muted-foreground">Last Maintenance</span>
          <span className={cn("font-medium",
            recentMaint ? "text-emerald-600" : lastMaint ? "text-muted-foreground" : "text-muted-foreground")}>
            {lastMaint
              ? formatDistanceToNow(lastMaint, { addSuffix: true })
              : <span className="italic">Never</span>}
          </span>
        </div>
      </div>

      {/* Expandable task history */}
      <AnimatePresence>
        {expanded && history?.tasks && history.tasks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/30 border-t border-border divide-y divide-border max-h-56 overflow-y-auto">
              {history.tasks.map(task => (
                <div
                  key={task.id}
                  className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onTaskClick(task.id)}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                    task.status === 'approved' ? 'bg-emerald-500' : task.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(task.createdAt), 'MMM yyyy')} · {task.assignedToName || 'Unassigned'}</p>
                  </div>
                  <Badge variant={task.status === 'approved' ? 'success' : 'outline'}
                    className="text-[10px] flex-shrink-0">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
