import * as React from "react"
import { useLocation, useSearch } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, CheckCircle2, ChevronLeft, Wrench, MapPin,
  ChevronRight, Cpu, Flame, Wind, Package, Layers, Lock
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
import { toast } from "sonner"

const SECTION_META: Record<TurbineSectionID, { icon: React.ElementType; color: string; borderColor: string; bgColor: string; desc: string }> = {
  'compressor': {
    icon: Layers,
    color: 'text-sky-700',
    borderColor: 'border-sky-300',
    bgColor: 'bg-sky-50',
    desc: 'Multi-stage axial compressor — blade rows, rotor discs, stator vanes, casing seals',
  },
  'mid-frame': {
    icon: Flame,
    color: 'text-amber-700',
    borderColor: 'border-amber-300',
    bgColor: 'bg-amber-50',
    desc: 'Combustion section — fuel injectors, combustor cans, transition pieces, diffuser casings',
  },
  'turbine': {
    icon: Cpu,
    color: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    bgColor: 'bg-emerald-50',
    desc: 'Hot gas expansion turbine — 4 stages with rotor blades, stator nozzles, shrouds',
  },
  'exit-cylinder': {
    icon: Wind,
    color: 'text-violet-700',
    borderColor: 'border-violet-300',
    bgColor: 'bg-violet-50',
    desc: 'Exhaust diffuser and exit casing — turning vanes, diffuser struts, exhaust collector',
  },
}

export default function CreateTask() {
  const [, setLocation] = useLocation()
  const searchStr = useSearch()
  const searchParams = React.useMemo(() => new URLSearchParams(searchStr), [searchStr])

  const { data: users } = useListUsers()
  const { data: assets } = useListAssets()
  const createTaskMutation = useCreateTask()

  const defaultAsset = assets?.[0]

  const [step, setStep] = React.useState(1)
  const [diagramSectionId, setDiagramSectionId] = React.useState<TurbineSectionID | null>(
    (searchParams.get('section') as TurbineSectionID) || null
  )

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

  const [selectedStageId, setSelectedStageId] = React.useState<number | null>(
    searchParams.get('stageId') ? parseInt(searchParams.get('stageId')!) : null
  )
  const selectedStage = stages?.find(s => s.id === selectedStageId) || null

  const { data: components } = useListComponents(selectedStageId ?? 0, {
    query: { enabled: !!selectedStageId }
  })

  const [selectedComponentId, setSelectedComponentId] = React.useState<number | null>(
    searchParams.get('componentId') ? parseInt(searchParams.get('componentId')!) : null
  )
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
    } catch (err: unknown) {
      const apiData = err && typeof err === "object" && "data" in err
        ? (err as { data?: { error?: string } }).data
        : null;
      toast.error(apiData?.error || (err instanceof Error ? err.message : "Failed to create task"));
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
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">SGT-9000HL · Work Order Creation</p>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Create Maintenance Task</h1>
          <p className="text-muted-foreground text-sm mt-1">Pinpoint the exact location, then define the task details.</p>
        </div>
        <button onClick={() => setLocation('/tasks')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 group flex-shrink-0 mb-1">
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Tasks
        </button>
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
                ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground border border-border'}`}>
                {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
            {i < 1 && <div className={`flex-1 h-px mx-3 max-w-[60px] transition-colors ${step > 1 ? 'bg-emerald-400' : 'bg-border'}`} />}
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
            <Card className="lg:col-span-3 p-6">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">Turbine Section Map</h2>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Click any section to select maintenance location</p>
                </div>
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

            {/* Right: Guided Assistant Panel */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden flex flex-col">
                {/* Panel Header */}
                <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-muted/30">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Location Selector</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {needsStage ? 'Three steps — section, stage, component' : 'Select a section on the diagram'}
                    </p>
                  </div>
                  {/* Overall progress dots */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${diagramSectionId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                    {needsStage && <>
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedStageId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedComponentId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                    </>}
                  </div>
                </div>

                {/* ─── STEP 1: SELECT SECTION ─── */}
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                      diagramSectionId
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-primary/10 text-primary border border-primary/30'
                    }`}>
                      {diagramSectionId ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                    </div>
                    <span className={`text-xs font-semibold ${diagramSectionId ? 'text-foreground/70' : 'text-foreground'}`}>
                      Select Section
                    </span>
                    {diagramSectionId && sectionMeta && selectedDbSection && (
                      <Badge variant="outline" className={`ml-auto text-[10px] ${sectionMeta.color} border-current/30 bg-current/5`}>
                        {selectedDbSection.name}
                      </Badge>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {!diagramSectionId ? (
                      <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-xs text-muted-foreground pl-9 leading-relaxed">
                        Click any highlighted zone on the turbine diagram to begin.
                      </motion.p>
                    ) : sectionMeta && selectedDbSection ? (
                      <motion.div key={diagramSectionId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className={`pl-9 flex items-start gap-2.5 p-3 rounded-xl border ${sectionMeta.borderColor} ${sectionMeta.bgColor}`}>
                        <sectionMeta.icon className={`w-4 h-4 ${sectionMeta.color} flex-shrink-0 mt-0.5`} />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{sectionMeta.desc}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* ─── STEP 2: SELECT STAGE (Turbine only) ─── */}
                {needsStage && (
                  <div className={`px-5 py-4 border-b border-border transition-opacity ${!selectedDbSection ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                        selectedStageId
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : selectedDbSection
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {selectedStageId ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedDbSection ? '2' : <Lock className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`text-xs font-semibold ${selectedStageId ? 'text-foreground/70' : selectedDbSection ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                        Select Stage
                      </span>
                      {selectedStage && (
                        <Badge variant="success" className="ml-auto text-[10px]">
                          {selectedStage.name}
                        </Badge>
                      )}
                    </div>

                    {selectedDbSection && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="grid grid-cols-2 gap-2 pl-9">
                        {stages?.map((stage) => (
                          <button
                            key={stage.id}
                            onClick={() => { setSelectedStageId(stage.id); setSelectedComponentId(null) }}
                            className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                              selectedStageId === stage.id
                                ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                : 'border-border bg-background hover:bg-muted hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`font-bold text-sm ${selectedStageId === stage.id ? 'text-emerald-700' : 'text-foreground'}`}>
                                {stage.name}
                              </span>
                              {selectedStageId === stage.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground/50">{stage.bladeCountMin}–{stage.bladeCountMax} blades</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ─── STEP 3: SELECT COMPONENT (Turbine only) ─── */}
                {needsStage && (
                  <div className={`px-5 py-4 transition-opacity ${!selectedStageId ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                        selectedComponentId
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : selectedStageId
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {selectedComponentId ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedStageId ? '3' : <Lock className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`text-xs font-semibold ${selectedComponentId ? 'text-foreground/70' : selectedStageId ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                        Select Component
                      </span>
                      {selectedComponent && (
                        <Badge variant="outline" className="ml-auto text-[10px] text-primary border-primary/30 bg-primary/8">
                          {selectedComponent.name}
                        </Badge>
                      )}
                    </div>

                    {selectedStageId && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-wrap gap-2 pl-9">
                        {components?.map((comp) => (
                          <button
                            key={comp.id}
                            onClick={() => setSelectedComponentId(comp.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 ${
                              selectedComponentId === comp.id
                                ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30'
                            }`}
                          >
                            {selectedComponentId === comp.id
                              ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              : <Package className="w-3 h-3 flex-shrink-0" />}
                            {comp.name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ─── CONTINUE BUTTON ─── */}
                <AnimatePresence>
                  {canContinue && (
                    <motion.div
                      key="continue-btn"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border p-5 bg-muted/30"
                    >
                      <Button onClick={() => setStep(2)} className="w-full gap-2" size="lg">
                        Continue to Task Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STEP 2: TASK DETAILS ── */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit}>
            {/* Location Summary Banner */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border mb-4 ${sectionMeta?.borderColor || 'border-border'} ${sectionMeta?.bgColor || 'bg-muted/40'}`}>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Main form */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Task Details</h2>
                    <p className="text-[10px] text-muted-foreground/50">Define the work order specifics</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 block">Task Title *</Label>
                    <Input
                      required
                      placeholder="e.g., Replace eroded Stage 1 rotor blades"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Detailed Description</Label>
                    <Textarea
                      placeholder="Specific instructions, safety procedures, tooling requirements, or inspection criteria..."
                      className="min-h-[120px] resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Side panel: scheduling + assignment */}
              <Card className="p-6 space-y-5">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Scheduling</h2>
                    <p className="text-[10px] text-muted-foreground/50">Assignment & timeline</p>
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Priority *</Label>
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
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Assign To</Label>
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
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Est. Hours</Label>
                  <Input
                    type="number" step="0.5" min="0" placeholder="e.g. 8"
                    value={formData.estimatedHours}
                    onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Deadline</Label>
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
