import * as React from "react"
import { useListAssets, useListSections, useListStages, useListComponents, useGetComponentHistory } from "@workspace/api-client-react"
import { Card, Badge } from "@/components/ui/core"
import { Wrench, Clock, History, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

export default function AssetHistory() {
  const { data: assets } = useListAssets()
  const defaultAsset = assets?.[0]
  
  const { data: sections } = useListSections(defaultAsset?.id ?? 0, {
    query: { enabled: !!defaultAsset?.id }
  })

  const [activeSectionId, setActiveSectionId] = React.useState<number | null>(null)

  // Automatically select first section when sections load
  React.useEffect(() => {
    if (sections?.length && !activeSectionId) {
      setActiveSectionId(sections[0].id)
    }
  }, [sections, activeSectionId])

  const { data: stages } = useListStages(activeSectionId ?? 0, {
    query: { enabled: !!activeSectionId }
  })

  // We could fetch components for all stages in the section to show them together
  // But for simplicity, we will just fetch components for all loaded stages manually or map them if API provides nested
  // Since we only have useListComponents(stageId), we'll do a simple parallel query or just pick the first stage's components to demonstrate
  const [activeStageId, setActiveStageId] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (stages?.length && !activeStageId) {
      setActiveStageId(stages[0].id)
    }
  }, [stages, activeStageId])

  const { data: components } = useListComponents(activeStageId ?? 0, {
    query: { enabled: !!activeStageId }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Asset History — {defaultAsset?.name || 'SGT-9000HL'}</h1>
        <p className="text-muted-foreground text-sm mt-2">Comprehensive maintenance record for all turbine components.</p>
      </div>

      {/* Section Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 hide-scrollbar">
        {sections?.map(section => (
          <button
            key={section.id}
            onClick={() => { setActiveSectionId(section.id); setActiveStageId(null); }}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeSectionId === section.id 
                ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(29,78,216,0.3)]' 
                : 'bg-card border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {section.name}
          </button>
        ))}
      </div>

      {/* Stage Sub-tabs */}
      {stages && stages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setActiveStageId(stage.id)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeStageId === stage.id
                  ? 'bg-secondary text-foreground border border-white/20'
                  : 'text-muted-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              {stage.name}
            </button>
          ))}
        </div>
      )}

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {components?.map(comp => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ComponentHistoryCard componentId={comp.id} componentName={comp.name} />
            </motion.div>
          ))}
          {components?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-white/5 border-dashed rounded-xl bg-card/20">
              No components found for this stage.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ComponentHistoryCard({ componentId, componentName }: { componentId: number, componentName: string }) {
  const { data: history, isLoading } = useGetComponentHistory(componentId)
  const [expanded, setExpanded] = React.useState(false)

  if (isLoading) {
    return <Card className="p-6 h-48 animate-pulse bg-card/40 border-white/5" />
  }

  const latestTask = history?.tasks?.[0]

  return (
    <Card className="overflow-hidden border-white/5 transition-all duration-300 hover:border-white/10 hover:shadow-xl bg-card/60 backdrop-blur-sm">
      <div 
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-foreground/90">{componentName}</h3>
          </div>
          {latestTask && (
            <Badge variant={latestTask.status === 'overdue' ? 'destructive' : latestTask.status === 'approved' ? 'success' : 'secondary'} className="text-[10px]">
              {latestTask.status.replace('_', ' ')}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><History className="w-3 h-3"/> Total Tasks</div>
            <div className="font-semibold text-foreground">{history?.totalTasks || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="w-3 h-3"/> Avg Repair</div>
            <div className="font-semibold text-foreground">
              {history?.avgRepairHours ? `${history.avgRepairHours.toFixed(1)}h` : 'N/A'}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Last Maintenance:</span>
          <span className="text-sm font-medium">
            {history?.lastMaintenanceDate ? format(new Date(history.lastMaintenanceDate), 'MMM dd, yyyy') : 'Never'}
          </span>
        </div>
      </div>

      {/* Expanded Task List */}
      <AnimatePresence>
        {expanded && history?.tasks && history.tasks.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-background/50 border-t border-white/5"
          >
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {history.tasks.map(task => (
                <div key={task.id} className="p-3 rounded-lg border border-white/5 bg-card/50 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium truncate pr-4">{task.title}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(task.createdAt), 'MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Technician: {task.assignedToName || 'N/A'}</span>
                    <Badge variant="outline" className="text-[10px]">{task.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}