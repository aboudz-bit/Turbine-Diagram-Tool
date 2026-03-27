import * as React from "react"
import { useCreateTask, useListUsers } from "@workspace/api-client-react"
import { TurbineDiagram, TURBINE_SECTIONS, STAGES_MOCK, COMPONENTS_MOCK, type TurbineSectionID } from "@/components/TurbineDiagram"
import { Card, Button, Input, Label, Textarea, Badge } from "@/components/ui/core"
import { motion, AnimatePresence } from "framer-motion"
import { useLocation } from "wouter"
import { ArrowRight, CheckCircle2, ChevronLeft, Wrench, PackageSearch } from "lucide-react"

export default function CreateTask() {
  const [, setLocation] = useLocation()
  const { data: users } = useListUsers()
  const createTaskMutation = useCreateTask()

  const [step, setStep] = React.useState(1)
  
  // Selections
  const [sectionId, setSectionId] = React.useState<string | null>(null)
  const [sectionName, setSectionName] = React.useState<string>('')
  
  const [stageName, setStageName] = React.useState<string | null>(null)
  const [componentName, setComponentName] = React.useState<string | null>(null)

  // Form State
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as any,
    estimatedHours: '',
    deadline: '',
    assignedToId: ''
  })

  const handleSectionSelect = (id: TurbineSectionID, name: string) => {
    setSectionId(id)
    setSectionName(name)
    setStageName(null)
    setComponentName(null)
    // Only Turbine has stages in our mock logic, but let's allow continuing for any section
  }

  const handleNext = () => {
    if (step === 1 && !sectionId) return
    if (step === 1 && sectionId === 'turbine' && (!stageName || !componentName)) return
    setStep(s => s + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // We mock IDs for section/stage since our UI isn't using exact DB IDs for the diagram mapping
    // In a real integration we'd map string selections to the specific DB IDs from useListSections
    const dummyAssetId = 1
    const dummySectionId = 1 

    try {
      await createTaskMutation.mutateAsync({
        data: {
          title: formData.title,
          description: formData.description || undefined,
          priority: formData.priority,
          assetId: dummyAssetId,
          sectionId: dummySectionId,
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
            
            <div className="mb-8">
              <Label className="text-muted-foreground mb-4 block uppercase tracking-wider text-xs">Interactive Turbine Map</Label>
              <TurbineDiagram 
                selectedSectionId={sectionId} 
                onSelectSection={handleSectionSelect} 
                interactive={true} 
              />
            </div>

            <AnimatePresence>
              {sectionId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="space-y-6 border-t border-white/10 pt-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Selected: <span className="text-primary font-bold">{sectionName}</span></span>
                    {sectionId !== 'turbine' && (
                      <Button onClick={handleNext} className="gap-2">
                        Continue to Details <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {sectionId === 'turbine' && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-muted-foreground mb-3 block uppercase tracking-wider text-xs">Select Stage</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {STAGES_MOCK.map((stage) => (
                            <div 
                              key={stage.id}
                              onClick={() => { setStageName(stage.name); setComponentName(null) }}
                              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${stageName === stage.name ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 'border-white/10 bg-card hover:bg-white/5'}`}
                            >
                              <div className={`font-bold ${stageName === stage.name ? 'text-emerald-400' : 'text-foreground'}`}>{stage.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">Blades: {stage.bladeCount}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {stageName && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Label className="text-muted-foreground mb-3 block uppercase tracking-wider text-xs">Select Component</Label>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {COMPONENTS_MOCK.map((comp) => (
                              <Badge 
                                key={comp}
                                onClick={() => setComponentName(comp)}
                                className={`px-4 py-2 cursor-pointer text-sm transition-all ${componentName === comp ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(29,78,216,0.3)]' : 'bg-transparent border border-white/20 text-muted-foreground hover:bg-white/5'}`}
                              >
                                {comp}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex justify-end pt-4 border-t border-white/5">
                            <Button onClick={handleNext} disabled={!componentName} className="gap-2">
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
                <Badge variant="outline">{sectionName}</Badge>
                {stageName && <><ArrowRight className="w-3 h-3 text-muted-foreground" /><Badge variant="outline">{stageName}</Badge></>}
                {componentName && <><ArrowRight className="w-3 h-3 text-muted-foreground" /><Badge variant="default" className="bg-primary/20">{componentName}</Badge></>}
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
                  <select 
                    className="flex h-11 w-full rounded-lg border border-white/10 bg-input/50 px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    required
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <select 
                    className="flex h-11 w-full rounded-lg border border-white/10 bg-input/50 px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
                  >
                    <option value="">-- Select Technician --</option>
                    {users?.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
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
