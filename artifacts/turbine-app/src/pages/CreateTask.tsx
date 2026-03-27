import * as React from "react"
import { useLocation } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { 
  ArrowRight, CheckCircle2, ChevronLeft, Wrench, PackageSearch,
  ChevronRight
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

export default function CreateTask() {
  const [, setLocation] = useLocation()
  
  // Data hooks
  const { data: users } = useListUsers()
  const { data: assets } = useListAssets()
  const createTaskMutation = useCreateTask()

  const defaultAsset = assets?.[0]
  
  const [step, setStep] = React.useState(1)
  
  // Selections
  const [diagramSectionId, setDiagramSectionId] = React.useState<TurbineSectionID | null>(null)
  
  const { data: sections } = useListSections(defaultAsset?.id ?? 0, {
    query: { enabled: !!defaultAsset?.id }
  })

  // Map the clicked diagram section to a real DB section
  const selectedDbSection = React.useMemo(() => {
    if (!diagramSectionId || !sections) return null
    const mappedName = SECTION_SLUG_MAP[diagramSectionId]
    return sections.find(s => s.name === mappedName) || null
  }, [diagramSectionId, sections])

  const { data: stages } = useListStages(selectedDbSection?.id ?? 0, {
    query: { enabled: !!selectedDbSection?.id }
  })

  const [selectedStageId, setSelectedStageId] = React.useState<number | null>(null)
  
  const selectedStage = React.useMemo(() => {
    return stages?.find(s => s.id === selectedStageId) || null
  }, [stages, selectedStageId])

  const { data: components } = useListComponents(selectedStageId ?? 0, {
    query: { enabled: !!selectedStageId }
  })

  const [selectedComponentId, setSelectedComponentId] = React.useState<number | null>(null)

  const selectedComponent = React.useMemo(() => {
    return components?.find(c => c.id === selectedComponentId) || null
  }, [components, selectedComponentId])

  // Form State
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedHours: '',
    deadline: '',
    assignedToId: ''
  })

  const handleSectionSelect = (id: TurbineSectionID, name: string) => {
    setDiagramSectionId(id)
    setSelectedStageId(null)
    setSelectedComponentId(null)
  }

  const handleNext = () => {
    if (step === 1 && !selectedDbSection) return
    // Require stage and component if it's the turbine section
    if (step === 1 && diagramSectionId === 'turbine' && (!selectedStageId || !selectedComponentId)) return
    setStep(s => s + 1)
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
      setLocation("/tasks")
    } catch (err) {
      console.error("Failed to create task", err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Create Maintenance Task</h1>
        <p className="text-muted-foreground text-sm">Pinpoint the exact location and assign task details.</p>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors ${step >= s ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(29,78,216,0.5)]' : 'bg-card border border-white/10 text-muted-foreground'}`}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 2 && <div className={`h-1 w-16 rounded-full transition-colors ${step > s ? 'bg-primary/50' : 'bg-white/5'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
          <Card className="p-6 border-white/5 bg-card/60 backdrop-blur-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><PackageSearch className="w-5 h-5 text-primary"/> Step 1: Select Location</h2>
            
            {/* Live Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
              <span>{defaultAsset?.name || 'SGT-9000HL'}</span>
              {selectedDbSection && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedDbSection.name}</span>
                </>
              )}
              {selectedStage && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground">{selectedStage.name}</span>
                </>
              )}
              {selectedComponent && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-primary font-medium">{selectedComponent.name}</span>
                </>
              )}
            </div>

            <div className="mb-8">
              <Label className="text-muted-foreground mb-4 block uppercase tracking-wider text-xs">Interactive Turbine Map</Label>
              <TurbineDiagram 
                selectedSectionId={diagramSectionId} 
                onSelectSection={handleSectionSelect} 
                interactive={true} 
              />
            </div>

            <AnimatePresence>
              {selectedDbSection && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="space-y-6 border-t border-white/10 pt-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Selected: <span className="text-primary font-bold">{selectedDbSection.name}</span></span>
                    {diagramSectionId !== 'turbine' && (
                      <Button onClick={handleNext} className="gap-2">
                        Continue to Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {diagramSectionId === 'turbine' && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-muted-foreground mb-3 block uppercase tracking-wider text-xs">Select Stage</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {stages?.map((stage) => (
                            <div 
                              key={stage.id}
                              onClick={() => { setSelectedStageId(stage.id); setSelectedComponentId(null) }}
                              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedStageId === stage.id ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 'border-white/10 bg-card hover:bg-white/5'}`}
                            >
                              <div className={`font-bold ${selectedStageId === stage.id ? 'text-emerald-400' : 'text-foreground'}`}>{stage.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">Blades: {stage.bladeCountMin}-{stage.bladeCountMax}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedStageId && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Label className="text-muted-foreground mb-3 block uppercase tracking-wider text-xs">Select Component</Label>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {components?.map((comp) => (
                              <Badge 
                                key={comp.id}
                                onClick={() => setSelectedComponentId(comp.id)}
                                className={`px-4 py-2 cursor-pointer text-sm transition-all ${selectedComponentId === comp.id ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(29,78,216,0.3)]' : 'bg-transparent border border-white/20 text-muted-foreground hover:bg-white/5'}`}
                              >
                                {comp.name}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex justify-end pt-4 border-t border-white/5">
                            <Button onClick={handleNext} disabled={!selectedComponentId} className="gap-2">
                              Continue to Details <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <form onSubmit={handleSubmit}>
            <Card className="p-6 border-white/5 bg-card/60 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-6">
                <Button type="button" variant="ghost" size="icon" onClick={() => setStep(1)}><ChevronLeft className="w-5 h-5"/></Button>
                <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="w-5 h-5 text-primary"/> Step 2: Task Details</h2>
              </div>

              {/* Location Summary */}
              <div className="bg-background/50 rounded-lg p-4 mb-8 border border-white/5 flex gap-2 items-center flex-wrap text-sm">
                <span className="text-muted-foreground">Location:</span>
                <Badge variant="outline">{selectedDbSection?.name}</Badge>
                {selectedStage && <><ArrowRight className="w-3 h-3 text-muted-foreground" /><Badge variant="outline">{selectedStage.name}</Badge></>}
                {selectedComponent && <><ArrowRight className="w-3 h-3 text-muted-foreground" /><Badge variant="default" className="bg-primary/20">{selectedComponent.name}</Badge></>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Task Title *</Label>
                  <Input 
                    required 
                    placeholder="e.g., Replace eroded rotor blades" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    required
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select 
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                  >
                    <option value="">-- Select Technician --</option>
                    {users?.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input 
                    type="number" 
                    step="0.5" 
                    placeholder="4.0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input 
                    type="datetime-local" 
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Detailed Description</Label>
                  <Textarea 
                    placeholder="Enter specific instructions, safety requirements, or notes..." 
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </Card>
          </form>
        </motion.div>
      )}
    </div>
  )
}
