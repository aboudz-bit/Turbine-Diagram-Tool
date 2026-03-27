import * as React from "react"
import { useLocation } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, CheckCircle2, ChevronLeft, Wrench, MapPin,
  ChevronRight, Cpu, Flame, Wind, Package, Layers
} from "lucide-react"
import {
  useCreateTask,
  useListUsers,
  useListAssets,
  useListSections,
  useListStages,
  useListComponents
} from "@workspace/api-client-react"
import { TurbineDiagram, SECTION_SLUG_MAP, type TurbineSectionID } from "@/components/TurbineDiagram"
import { Card, Button, Input, Label, Textarea, Badge, Select } from "@/components/ui/core"

const SECTION_META: Record<TurbineSectionID, { icon: React.ElementType; color: string; borderColor: string; bgColor: string; desc: string }> = {
  'compressor': {
    icon: Layers,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/40',
    bgColor: 'bg-sky-500/10',
    desc: 'Multi-stage axial compressor — blade rows, rotor discs, stator vanes, casing seals',
  },
  'mid-frame': {
    icon: Flame,
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    desc: 'Combustion section — fuel injectors, combustor cans, transition pieces, diffuser casings',
  },
  'turbine': {
    icon: Cpu,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-500/10',
    desc: 'Hot gas expansion turbine — 4 stages with rotor blades, stator nozzles, shrouds',
  },
  'exit-cylinder': {
    icon: Wind,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/40',
    bgColor: 'bg-violet-500/10',
    desc: 'Exhaust diffuser and exit casing — turning vanes, diffuser struts, exhaust collector',
  },
}

export default function CreateTask() {
  const [, setLocation] = useLocation()

  const { data: users } = useListUsers()
  const { data: assets } = useListAssets()
  const createTaskMutation = useCreateTask()

  const defaultAsset = assets?.[0]

  const [step, setStep] = React.useState(1)
  const [diagramSectionId, setDiagramSectionId] = React.useState<TurbineSectionID | null>(null)

  const { data: sections } = useListSections(defaultAsset?.id ?? 0, {
    query: { enabled: !!defaultAsset?.id }
  })

  const selectedDbSection = React.useMemo(() => {
    if (!diagramSectionId || !sections) return null
    const mapped = SECTION_SLUG_MAP[diagramSectionId]
    return sections.find(s => s.name === mapped) || null
  }, [diagramSectionId, sections])

  const { data: stages } = useListStages(selectedDbSection?.id ?? 0, {
    query: { enabled: !!selectedDbSection?.id }
  })

  const [selectedStageId, setSelectedStageId] = React.useState<number | null>(null)
  const selectedStage = stages?.find(s => s.id === selectedStageId) || null

  const { data: components } = useListComponents(selectedStageId ?? 0, {
    query: { enabled: !!selectedStageId }
  })

  const [selectedComponentId, setSelectedComponentId] = React.useState<number | null>(null)
  const selectedComponent = components?.find(c => c.id === selectedComponentId) || null

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedHours: '',
    deadline: '',
    assignedToId: '',
  })

  const sectionMeta = diagramSectionId ? SECTION_META[diagramSectionId] : null
  const needsStage = diagramSectionId === 'turbine'
  const canContinue = !!selectedDbSection && (!needsStage || (!!selectedStageId && !!selectedComponentId))

  const handleSectionSelect = (id: TurbineSectionID) => {
    setDiagramSectionId(id)
    setSelectedStageId(null)
    setSelectedComponentId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!defaultAsset || !selectedDbSection) return
    try {
      await createTaskMutation.mutateAsync({
        data: {
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          assetId: defaultAsset.id,
          sectionId: selectedDbSection.id,
          stageId: selectedStageId || undefined,
          componentId: selectedComponentId || undefined,
          assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : undefined,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        }
      })
      setLocation('/tasks')
    } catch (err) {
      console.error('Failed to create task', err)
    }
  }

  // ── Breadcrumb always visible ──
  function Breadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        <span className="text-muted-foreground font-medium">{defaultAsset?.name || 'SGT-9000HL'}</span>
        {selectedDbSection && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className={`font-semibold ${sectionMeta?.color || 'text-foreground'}`}>{selectedDbSection.name}</span>
          </>
        )}
        {selectedStage && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className="font-semibold text-foreground">{selectedStage.name}</span>
          </>
        )}
        {selectedComponent && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className="font-semibold text-primary">{selectedComponent.name}</span>
          </>
        )}
        {!selectedDbSection && (
          <span className="text-muted-foreground/60 italic">— select a section on the diagram</span>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-5">
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Create Maintenance Task</h1>
        <p className="text-muted-foreground text-xs mt-0.5">Pinpoint the exact location, then define the task details.</p>
      </div>

      {/* ── STEPPER ── */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Select Location' },
          { n: 2, label: 'Task Details' },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-primary text-white shadow-[0_0_12px_rgba(29,78,216,0.5)]' : 'bg-white/5 text-muted-foreground border border-white/10'}`}>
                {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-px mx-3 max-w-[60px] transition-colors ${step > 1 ? 'bg-emerald-500/50' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
        {/* Live breadcrumb in stepper row */}
        <div className="ml-auto">
          <Breadcrumb />
        </div>
      </div>

      {/* ── STEP 1: SELECT LOCATION ── */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: Turbine Diagram */}
            <Card className="lg:col-span-3 p-5 border-white/5 bg-card/60">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Turbine Section Map</h2>
                <span className="text-xs text-muted-foreground ml-1">— click to select</span>
              </div>
              <TurbineDiagram
                selectedSectionId={diagramSectionId}
                onSelectSection={handleSectionSelect}
                interactive={true}
              />
              {!diagramSectionId && (
                <p className="text-center text-xs text-muted-foreground mt-4 animate-pulse">
                  Click on any section above to select the maintenance location
                </p>
              )}
            </Card>

            {/* Right: Location Details Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Selected Section Info */}
              <AnimatePresence mode="wait">
                {!diagramSectionId && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Card className="p-5 border-dashed border-white/10 bg-card/30 flex flex-col items-center justify-center min-h-[180px] text-center gap-3">
                      <MapPin className="w-8 h-8 text-muted-foreground/30" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No section selected</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Select a section on the turbine diagram</p>
                      </div>
                    </Card>
                  </motion.div>
                )}

                {diagramSectionId && sectionMeta && (
                  <motion.div key={diagramSectionId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`p-5 border ${sectionMeta.borderColor} ${sectionMeta.bgColor} backdrop-blur-sm`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 flex-shrink-0`}>
                          <sectionMeta.icon className={`w-5 h-5 ${sectionMeta.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-base ${sectionMeta.color}`}>{selectedDbSection?.name}</h3>
                            <Badge variant="outline" className="text-[10px] border-white/20">Selected</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{sectionMeta.desc}</p>
                        </div>
                      </div>

                      {/* Non-turbine: show continue button immediately */}
                      {!needsStage && (
                        <Button onClick={() => setStep(2)} className="w-full gap-2 mt-2">
                          Continue to Task Details <ArrowRight className="w-4 h-4" />
                        </Button>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stage Selection (Turbine only) */}
              <AnimatePresence>
                {needsStage && selectedDbSection && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-5 border-white/5 bg-card/60">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Select Stage</span>
                        {selectedStage && <Badge variant="success" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-transparent">{selectedStage.name}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {stages?.map((stage) => (
                          <button
                            key={stage.id}
                            onClick={() => { setSelectedStageId(stage.id); setSelectedComponentId(null) }}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              selectedStageId === stage.id
                                ? 'border-emerald-500/60 bg-emerald-500/15 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                            }`}
                          >
                            <div className={`font-bold text-sm ${selectedStageId === stage.id ? 'text-emerald-400' : 'text-foreground/90'}`}>
                              {stage.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {stage.bladeCountMin}–{stage.bladeCountMax} blades
                            </div>
                          </button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Component Selection */}
              <AnimatePresence>
                {needsStage && selectedStageId && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card className="p-5 border-white/5 bg-card/60">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Select Component</span>
                        {selectedComponent && <Badge variant="default" className="text-[10px] bg-primary/20 border-transparent">{selectedComponent.name}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {components?.map((comp) => (
                          <button
                            key={comp.id}
                            onClick={() => setSelectedComponentId(comp.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                              selectedComponentId === comp.id
                                ? 'border-primary/60 bg-primary/20 text-primary shadow-[0_0_10px_rgba(29,78,216,0.2)]'
                                : 'border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-foreground hover:border-white/20'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5 flex-shrink-0" />
                            {comp.name}
                          </button>
                        ))}
                      </div>

                      {selectedComponentId && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                          <Button onClick={() => setStep(2)} className="w-full gap-2">
                            Continue to Task Details <ArrowRight className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STEP 2: TASK DETAILS ── */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit}>
            {/* Location Summary Banner */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border mb-4 ${sectionMeta?.borderColor || 'border-white/10'} ${sectionMeta?.bgColor || 'bg-white/5'}`}>
              <MapPin className={`w-4 h-4 flex-shrink-0 ${sectionMeta?.color || 'text-muted-foreground'}`} />
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                <span className="text-muted-foreground text-xs">{defaultAsset?.name}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className={`font-semibold ${sectionMeta?.color}`}>{selectedDbSection?.name}</span>
                {selectedStage && <>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  <span className="font-semibold text-foreground">{selectedStage.name}</span>
                </>}
                {selectedComponent && <>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                  <span className="font-bold text-primary">{selectedComponent.name}</span>
                </>}
              </div>
              <button type="button" onClick={() => setStep(1)}
                className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Change
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main form */}
              <Card className="lg:col-span-2 p-5 border-white/5 bg-card/60">
                <div className="flex items-center gap-2 mb-5">
                  <Wrench className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Task Details</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Task Title *</Label>
                    <Input
                      required
                      placeholder="e.g., Replace eroded Stage 1 rotor blades"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Detailed Description</Label>
                    <Textarea
                      placeholder="Specific instructions, safety procedures, tooling requirements, or inspection criteria..."
                      className="min-h-[110px] resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Side panel: scheduling + assignment */}
              <Card className="p-5 border-white/5 bg-card/60 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Scheduling</h2>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Priority *</Label>
                  <Select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Assign To</Label>
                  <Select
                    value={formData.assignedToId}
                    onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
                  >
                    <option value="">— Unassigned —</option>
                    {users?.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Est. Hours</Label>
                  <Input
                    type="number" step="0.5" min="0" placeholder="e.g. 8"
                    value={formData.estimatedHours}
                    onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Deadline</Label>
                  <Input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    size="lg"
                    disabled={!formData.title || createTaskMutation.isPending}
                  >
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                  {!formData.title && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">Task title is required</p>
                  )}
                </div>
              </Card>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  )
}
