import * as React from "react"
import { useLocation, useSearch } from "wouter"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, CheckCircle2, ChevronLeft, Wrench, MapPin,
  ChevronRight, Cpu, Flame, Wind, Package, Layers, Lock,
  AlertTriangle, ShieldAlert, FileText, Gauge, ChevronDown, ChevronUp, Zap,
} from "lucide-react"
import {
  useCreateTask,
  useListUsers,
  useListAssets,
  useListSections,
  useListStages,
  useListComponents,
} from "@workspace/api-client-react"
import type { Asset } from "@workspace/api-client-react"
import { TurbineDiagram, type TurbineSectionID } from "@/components/TurbineDiagram"
import { Card, Button, Input, Label, Textarea, Badge, Select } from "@/components/ui/core"
import { useToast } from "@/hooks/use-toast"
import {
  getTemplatesForContext, RISK_CONFIG,
  type TurbineTemplate, type TurbineModel, type TurbineSectionSlug,
} from "@/lib/turbineTemplates"
import { getQcContext } from "@/lib/qcRules"
import { usePermissions } from "@/hooks/usePermissions"

// ─── Section name mapping: diagram slug → DB section name per model ──────────
const SECTION_NAME_MAP: Record<TurbineModel, Record<TurbineSectionID, string>> = {
  'SGT-9000HL': {
    'compressor':    'Compressor',
    'mid-frame':     'Mid Frame',
    'turbine':       'Turbine',
    'exit-cylinder': 'Turbine Exit Cylinder',
  },
  'SGT-8000H': {
    'compressor':    'Compressor',
    'mid-frame':     'Combustion Chamber',
    'turbine':       'Turbine',
    'exit-cylinder': 'Exhaust Diffuser',
  },
}

// ─── Section display config (shared across models) ────────────────────────────
const SECTION_META: Record<TurbineSectionID, {
  icon: React.ElementType; color: string; borderColor: string; bgColor: string
  label: (model: TurbineModel) => string; desc: (model: TurbineModel) => string
}> = {
  'compressor': {
    icon: Layers,
    color: 'text-sky-700', borderColor: 'border-sky-300', bgColor: 'bg-sky-50',
    label: () => 'Compressor',
    desc: (m) => m === 'SGT-9000HL'
      ? 'Multi-stage axial compressor — blade rows, rotor discs, stator vanes, VGV system, casing seals'
      : '7-stage axial compressor — variable inlet guide vanes, anti-icing bleed, inter-stage bleeds',
  },
  'mid-frame': {
    icon: Flame,
    color: 'text-amber-700', borderColor: 'border-amber-300', bgColor: 'bg-amber-50',
    label: (m) => m === 'SGT-9000HL' ? 'Mid Frame' : 'Combustion Chamber',
    desc: (m) => m === 'SGT-9000HL'
      ? 'Combustion section — fuel injectors, combustor cans, transition pieces, diffuser casings'
      : '8 can-annular combustors — dual-fuel DLE burners, crossfire tubes, liner assemblies',
  },
  'turbine': {
    icon: Cpu,
    color: 'text-emerald-700', borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50',
    label: () => 'Turbine',
    desc: (m) => m === 'SGT-9000HL'
      ? 'Hot gas expansion turbine — 4 stages, TBC-coated rotor blades, cooled stator nozzles, shrouds'
      : '3-stage power turbine — uncooled Stage 3 blades, heat shields, shroud segments',
  },
  'exit-cylinder': {
    icon: Wind,
    color: 'text-violet-700', borderColor: 'border-violet-300', bgColor: 'bg-violet-50',
    label: (m) => m === 'SGT-9000HL' ? 'Turbine Exit Cylinder' : 'Exhaust Diffuser',
    desc: (m) => m === 'SGT-9000HL'
      ? 'Exhaust diffuser and exit casing — turning vanes, diffuser struts, exhaust collector'
      : 'Exhaust gas diffuser — outer/inner diffuser cones, struts, flex seals',
  },
}

// ─── Turbine model cards config ───────────────────────────────────────────────
const TURBINE_MODELS: { model: TurbineModel; tagline: string; specs: string[] }[] = [
  {
    model: 'SGT-9000HL',
    tagline: 'High-performance H-class — 4-stage turbine, TBC-coated blades',
    specs: ['4-stage hot section', 'TBC-coated blades', 'Strict clearance tolerances', 'Cooling hole QC'],
  },
  {
    model: 'SGT-8000H',
    tagline: 'Standard H-class — 3-stage turbine, can-annular combustion',
    specs: ['3-stage hot section', 'Can-annular combustors', 'Standard tolerances', 'Routine QC scope'],
  },
]

// ─── Template picker component ────────────────────────────────────────────────
function TemplatePicker({
  turbineModel, sectionSlug, onApply,
}: { turbineModel: TurbineModel; sectionSlug: TurbineSectionSlug; onApply: (t: TurbineTemplate) => void }) {
  const templates = getTemplatesForContext(turbineModel, sectionSlug)
  const [expanded, setExpanded] = React.useState<string | null>(null)

  if (!templates.length) return null

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
          <FileText className="w-3.5 h-3.5 text-violet-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">OEM Templates</h3>
          <p className="text-[10px] text-muted-foreground">{turbineModel} · {templates.length} applicable</p>
        </div>
      </div>

      <div className="space-y-2">
        {templates.map((t) => {
          const risk = RISK_CONFIG[t.riskLevel]
          const isExpanded = expanded === t.id
          return (
            <div key={t.id} className={`rounded-xl border transition-all ${risk.border} ${isExpanded ? risk.bg : 'bg-background hover:bg-muted/40'}`}>
              <button
                type="button"
                className="w-full text-left p-3 flex items-start gap-2.5"
                onClick={() => setExpanded(isExpanded ? null : t.id)}
              >
                <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${risk.color} ${risk.bg} border ${risk.border}`}>
                  {risk.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t.checklist.length} checks · {t.measurements.length} measurements
                  </p>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Checklist ({t.checklist.length})</p>
                        <ul className="space-y-1">
                          {t.checklist.slice(0, 4).map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                              <CheckCircle2 className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                              {c}
                            </li>
                          ))}
                          {t.checklist.length > 4 && (
                            <li className="text-[11px] text-muted-foreground pl-4">+{t.checklist.length - 4} more items…</li>
                          )}
                        </ul>
                      </div>

                      {t.measurements.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Key Measurements</p>
                          <div className="space-y-1">
                            {t.measurements.map((m, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px]">
                                <span className="text-foreground flex items-center gap-1">
                                  <Gauge className="w-2.5 h-2.5 text-muted-foreground" /> {m.name}
                                </span>
                                <span className={`font-mono ${risk.color} font-semibold`}>{m.nominalRange} {m.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {t.note && (
                        <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          ⚠ {t.note}
                        </p>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => { onApply(t); setExpanded(null) }}
                      >
                        Apply Template <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── QC Rules panel ───────────────────────────────────────────────────────────
function QcRulesPanel({ turbineModel, sectionSlug }: { turbineModel: TurbineModel; sectionSlug: TurbineSectionSlug }) {
  const qc = getQcContext(turbineModel, sectionSlug)
  const [open, setOpen] = React.useState(false)
  if (!qc) return null

  const mandatoryCount = qc.rules.filter(r => r.mandatory).length

  return (
    <div className="space-y-2">
      {/* Warning banner */}
      {qc.warning && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
            qc.isCriticalZone
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {qc.isCriticalZone
            ? <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            {qc.isCriticalZone && (
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-700 mb-0.5">Critical Zone — {turbineModel}</p>
            )}
            <p className={`text-xs font-medium ${qc.isCriticalZone ? 'text-red-700' : 'text-amber-800'}`}>{qc.warning}</p>
            {qc.oemProcedure && (
              <p className={`text-[10px] mt-1 font-mono ${qc.isCriticalZone ? 'text-red-600' : 'text-amber-700'}`}>
                OEM Procedure: {qc.oemProcedure} (mandatory — overrides all templates)
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Collapsible QC rules */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
          onClick={() => setOpen(!open)}
        >
          <ShieldAlert className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs font-semibold text-foreground">
              {turbineModel} QC Requirements
            </span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {mandatoryCount} mandatory · {qc.rules.length - mandatoryCount} recommended
            </span>
          </div>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2 border-t border-border">
                {qc.rules.map((rule) => (
                  <div key={rule.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${
                    rule.mandatory ? 'bg-primary/5 border border-primary/15' : 'bg-muted/40'
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      rule.mandatory ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {rule.mandatory
                        ? <ShieldAlert className="w-2.5 h-2.5" />
                        : <CheckCircle2 className="w-2.5 h-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground leading-tight">{rule.label}</p>
                      {rule.detail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{rule.detail}</p>
                      )}
                    </div>
                    {rule.mandatory && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        REQ
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreateTask() {
  const [, setLocation] = useLocation()
  const searchStr = useSearch()
  const searchParams = React.useMemo(() => new URLSearchParams(searchStr), [searchStr])
  const { toast } = useToast()

  const { canCreateTask } = usePermissions()
  const { data: users } = useListUsers()
  const {
    data: assets,
    isLoading: assetsLoading,
    isError: assetsError,
    error: assetsQueryError,
    refetch: refetchAssets,
  } = useListAssets({
    query: { refetchOnMount: 'always', staleTime: 0 },
  })
  const createTaskMutation = useCreateTask()

  React.useEffect(() => {
    console.log('[CreateTask] assets state:', assets, 'loading:', assetsLoading, 'error:', assetsError)
    if (assetsError && assetsQueryError) {
      console.error('[CreateTask] assets error detail:', assetsQueryError)
    }
  }, [assets, assetsLoading, assetsError, assetsQueryError])

  // ── Turbine selection (replaces hardcoded defaultAsset) ──
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null)

  // Auto-select if only one asset exists
  React.useEffect(() => {
    if (assets?.length === 1 && !selectedAsset) setSelectedAsset(assets[0])
  }, [assets, selectedAsset])

  const turbineModel = (selectedAsset?.model ?? null) as TurbineModel | null

  // ── Location state ──
  const [step, setStep] = React.useState(1)
  const [diagramSectionId, setDiagramSectionId] = React.useState<TurbineSectionID | null>(
    (searchParams.get('section') as TurbineSectionID) || null,
  )

  const { data: sections } = useListSections(selectedAsset?.id ?? 0, {
    query: { enabled: !!selectedAsset?.id },
  })

  const selectedDbSection = React.useMemo(() => {
    if (!diagramSectionId || !sections || !turbineModel) return null
    const name = SECTION_NAME_MAP[turbineModel][diagramSectionId]
    return sections.find(s => s.name === name) ?? null
  }, [diagramSectionId, sections, turbineModel])

  const { data: stages } = useListStages(selectedDbSection?.id ?? 0, {
    query: { enabled: !!selectedDbSection?.id },
  })

  const [selectedStageId, setSelectedStageId] = React.useState<number | null>(
    searchParams.get('stageId') ? parseInt(searchParams.get('stageId')!) : null,
  )
  const selectedStage = stages?.find(s => s.id === selectedStageId) ?? null

  const { data: components } = useListComponents(selectedStageId ?? 0, {
    query: { enabled: !!selectedStageId },
  })

  const [selectedComponentId, setSelectedComponentId] = React.useState<number | null>(
    searchParams.get('componentId') ? parseInt(searchParams.get('componentId')!) : null,
  )
  const selectedComponent = components?.find(c => c.id === selectedComponentId) ?? null

  const sectionMeta = diagramSectionId ? SECTION_META[diagramSectionId] : null
  const needsStage = diagramSectionId === 'turbine'
  const canContinue = !!selectedAsset && !!selectedDbSection &&
    (!needsStage || (!!selectedStageId && !!selectedComponentId))

  const qcContext = React.useMemo(() => {
    if (!turbineModel || !diagramSectionId) return null
    return getQcContext(turbineModel, diagramSectionId as TurbineSectionSlug)
  }, [turbineModel, diagramSectionId])

  // ── Form data — declared BEFORE the deadline useEffect that reads formData.priority ──
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedHours: '',
    deadline: '',
    assignedToId: '',
  })

  // ── Deadline suggestion ──
  const [deadlineSuggestion, setDeadlineSuggestion] = React.useState<{
    suggestedDurationHours: number;
    suggestedDeadline: string;
    confidence: string;
    basedOnSamples: number;
  } | null>(null)

  // Fetch deadline suggestion when location + priority changes
  React.useEffect(() => {
    if (!selectedAsset || !selectedDbSection) {
      setDeadlineSuggestion(null)
      return
    }
    const params = new URLSearchParams({
      assetId: String(selectedAsset.id),
      sectionId: String(selectedDbSection.id),
      priority: formData.priority,
    })
    if (selectedStageId) params.set('stageId', String(selectedStageId))
    const controller = new AbortController()
    const token = localStorage.getItem('turbine_auth_token')
    fetch(`/api/deadline/suggest?${params}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDeadlineSuggestion(data) })
      .catch(() => {})
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset?.id, selectedDbSection?.id, selectedStageId, formData.priority])

  const handleSectionSelect = (id: TurbineSectionID) => {
    setDiagramSectionId(id)
    setSelectedStageId(null)
    setSelectedComponentId(null)
  }

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    setDiagramSectionId(null)
    setSelectedStageId(null)
    setSelectedComponentId(null)
  }

  const handleApplyTemplate = (template: TurbineTemplate) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      priority: template.riskLevel === 'critical' ? 'high'
        : template.riskLevel === 'elevated' ? 'high'
        : template.riskLevel === 'medium' ? 'medium'
        : 'low',
    }))
    toast({ title: 'Template applied', description: template.title })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset || !selectedDbSection) {
      toast({ title: 'Missing location', description: 'Please select a turbine and section first.', variant: 'destructive' })
      return
    }

    const payload = {
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      assetId: selectedAsset.id,
      sectionId: selectedDbSection.id,
      stageId: selectedStageId || undefined,
      componentId: selectedComponentId || undefined,
      assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
    }

    console.log('Submitting task', payload)

    try {
      const result = await createTaskMutation.mutateAsync({ data: payload })
      toast({ title: 'Task created', description: `Work order #${result.id} has been created successfully.` })
      setLocation('/tasks')
    } catch (err) {
      console.error('[CreateTask] Failed to create task', err)
      // ApiError shape: err.data = parsed body, err.status = HTTP code
      const apiErr = err as { data?: { error?: string; details?: Record<string, string[]> }; status?: number }
      let message: string
      if (apiErr?.data?.error) {
        message = apiErr.data.error
        if (apiErr.data.details) {
          const fields = Object.entries(apiErr.data.details)
            .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
            .map(([f, msgs]) => `${f}: ${(msgs as string[]).join(', ')}`)
            .join('; ')
          if (fields) message += ` (${fields})`
        }
      } else if (!apiErr?.status) {
        message = 'Server unavailable. Please check your connection and try again.'
      } else {
        message = 'An unexpected error occurred. Please try again.'
      }
      toast({ title: 'Failed to create task', description: message, variant: 'destructive' })
    }
  }

  // ── Breadcrumb ──
  function Breadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-xs flex-wrap">
        {selectedAsset ? (
          <span className="font-semibold text-foreground">{selectedAsset.name}</span>
        ) : (
          <span className="text-muted-foreground italic">Select a turbine</span>
        )}
        {selectedDbSection && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            <span className={`font-semibold ${sectionMeta?.color}`}>{selectedDbSection.name}</span>
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
      </div>
    )
  }

  if (!canCreateTask) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Task creation is only available to engineers, supervisors, and site managers.<br />
            Contact your supervisor if you need a work order created.
          </p>
        </div>
        <button
          onClick={() => setLocation('/tasks')}
          className="text-sm text-primary hover:underline font-medium"
        >
          ← Back to Task List
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">
            {selectedAsset ? selectedAsset.model : 'GAS TURBINE'} · Work Order Creation
          </p>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Create Maintenance Task</h1>
          <p className="text-muted-foreground text-sm mt-1">Select turbine unit, pinpoint location, then define the work order.</p>
        </div>
        <button
          onClick={() => setLocation('/tasks')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 group flex-shrink-0 mb-1"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Tasks
        </button>
      </div>

      {/* ── STEPPER ── */}
      <div className="flex items-center gap-0">
        {[{ n: 1, label: 'Select Location' }, { n: 2, label: 'Task Details' }].map((s, i) => (
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
        <div className="ml-auto"><Breadcrumb /></div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1: SELECT LOCATION
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── LEFT: Turbine + Diagram ── */}
            <div className="lg:col-span-3 space-y-4">

              {/* Turbine Model Selector */}
              <Card className="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Select Turbine Unit</h2>
                    <p className="text-[10px] text-muted-foreground">Choose the asset this work order applies to</p>
                  </div>
                  {selectedAsset && (
                    <Badge variant="success" className="ml-auto text-[10px]">{selectedAsset.model}</Badge>
                  )}
                </div>

                {assetsLoading && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    Loading turbine units…
                  </div>
                )}
                {assetsError && !assetsLoading && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                    <p className="text-xs font-medium text-destructive">
                      Failed to load turbine units
                    </p>
                    <p className="text-[11px] text-destructive/80">
                      {(assetsQueryError as { message?: string })?.message ?? 'Check your connection and try again.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { console.log('[CreateTask] Retrying assets fetch'); refetchAssets(); }}
                      className="text-[11px] underline text-destructive hover:opacity-70"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!assetsLoading && !assetsError && (assets ?? []).length === 0 && (
                  <div className="py-4 text-sm text-muted-foreground">
                    No turbine units found in the system.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(assets ?? []).map((asset) => {
                    const modelInfo = TURBINE_MODELS.find(m => m.model === asset.model)
                    const isSelected = selectedAsset?.id === asset.id
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleAssetSelect(asset)}
                        className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-background hover:bg-muted hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{asset.model}</p>
                            <p className="text-[10px] text-muted-foreground">{asset.name}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {modelInfo && (
                          <>
                            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{modelInfo.tagline}</p>
                            <div className="flex flex-wrap gap-1">
                              {modelInfo.specs.map(spec => (
                                <span key={spec} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                }`}>{spec}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Card>

              {/* Turbine Diagram (only after asset selected) */}
              <AnimatePresence>
                {selectedAsset && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="p-6">
                      <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-sm text-foreground">Turbine Section Map</h2>
                          <p className="text-[10px] text-muted-foreground">
                            Click a zone to select the maintenance location
                          </p>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT: Guided Assistant Panel ── */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden flex flex-col">
                {/* Panel header */}
                <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-muted/30">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Location Selector</p>
                    <p className="text-[10px] text-muted-foreground">
                      {!selectedAsset ? 'Start by selecting a turbine unit' : needsStage ? 'Three steps — section, stage, component' : 'Section selected — ready to continue'}
                    </p>
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedAsset ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${diagramSectionId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                    {needsStage && <>
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedStageId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${selectedComponentId ? 'bg-emerald-500' : 'bg-muted-foreground/25'}`} />
                    </>}
                  </div>
                </div>

                {/* Step 0: Select Turbine (summary after selection) */}
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                      selectedAsset
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-primary/10 text-primary border border-primary/30'
                    }`}>
                      {selectedAsset ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                    </div>
                    <span className={`text-xs font-semibold ${selectedAsset ? 'text-foreground/70' : 'text-foreground'}`}>
                      Select Turbine Unit
                    </span>
                    {selectedAsset && (
                      <Badge variant="success" className="ml-auto text-[10px]">{selectedAsset.model}</Badge>
                    )}
                  </div>
                  {!selectedAsset ? (
                    <p className="text-xs text-muted-foreground pl-9 leading-relaxed">
                      Choose SGT-8000H or SGT-9000HL from the unit selector.
                    </p>
                  ) : (
                    <div className="pl-9 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <p className="text-[11px] text-foreground font-medium">{selectedAsset.name}</p>
                    </div>
                  )}
                </div>

                {/* Step 1: Select Section */}
                <div className={`px-5 py-4 border-b border-border transition-opacity ${!selectedAsset ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                      diagramSectionId
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : selectedAsset
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {diagramSectionId ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedAsset ? '2' : <Lock className="w-2.5 h-2.5" />}
                    </div>
                    <span className={`text-xs font-semibold ${diagramSectionId ? 'text-foreground/70' : 'text-foreground'}`}>
                      Select Section
                    </span>
                    {diagramSectionId && sectionMeta && selectedDbSection && turbineModel && (
                      <Badge variant="outline" className={`ml-auto text-[10px] ${sectionMeta.color} border-current/30 bg-current/5`}>
                        {sectionMeta.label(turbineModel)}
                      </Badge>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {!selectedAsset || !diagramSectionId ? (
                      <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-xs text-muted-foreground pl-9 leading-relaxed">
                        {selectedAsset ? 'Click any highlighted zone on the diagram.' : 'Select a turbine unit first.'}
                      </motion.p>
                    ) : sectionMeta && selectedDbSection && turbineModel ? (
                      <motion.div key={diagramSectionId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className={`pl-9 flex items-start gap-2.5 p-3 rounded-xl border ${sectionMeta.borderColor} ${sectionMeta.bgColor}`}>
                        <sectionMeta.icon className={`w-4 h-4 ${sectionMeta.color} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-xs font-bold ${sectionMeta.color}`}>{sectionMeta.label(turbineModel)}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{sectionMeta.desc(turbineModel)}</p>
                          {qcContext?.isCriticalZone && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <ShieldAlert className="w-3 h-3 text-red-600" />
                              <span className="text-[10px] font-bold text-red-700">CRITICAL ZONE — Strict QC required</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {/* Step 2: Select Stage (Turbine sections only) */}
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
                        {selectedStageId ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedDbSection ? '3' : <Lock className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`text-xs font-semibold ${selectedStageId ? 'text-foreground/70' : selectedDbSection ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                        Select Stage
                      </span>
                      {selectedStage && (
                        <Badge variant="success" className="ml-auto text-[10px]">{selectedStage.name}</Badge>
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
                            {(stage.bladeCountMin ?? 0) > 0 && (
                              <p className="text-[10px] text-muted-foreground">{stage.bladeCountMin}–{stage.bladeCountMax} blades</p>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Step 3: Select Component (Turbine sections only) */}
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
                        {selectedComponentId ? <CheckCircle2 className="w-3.5 h-3.5" /> : selectedStageId ? '4' : <Lock className="w-2.5 h-2.5" />}
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

                {/* Continue button */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2: TASK DETAILS
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSubmit}>

            {/* Location summary banner */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border mb-3 ${sectionMeta?.borderColor || 'border-border'} ${sectionMeta?.bgColor || 'bg-muted/40'}`}>
              <MapPin className={`w-4 h-4 flex-shrink-0 ${sectionMeta?.color || 'text-muted-foreground'}`} />
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                <span className="text-muted-foreground text-xs">{selectedAsset?.name}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className={`font-semibold ${sectionMeta?.color}`}>
                  {turbineModel && diagramSectionId ? sectionMeta?.label(turbineModel) : selectedDbSection?.name}
                </span>
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

            {/* QC + Warning banners */}
            {turbineModel && diagramSectionId && (
              <div className="mb-4">
                <QcRulesPanel turbineModel={turbineModel} sectionSlug={diagramSectionId as TurbineSectionSlug} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* ── Main form ── */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Task Details</h2>
                    <p className="text-[10px] text-muted-foreground">
                      {turbineModel
                        ? `${turbineModel} work order · ${turbineModel === 'SGT-9000HL' ? 'Stricter QC required' : 'Standard procedures apply'}`
                        : 'Define the work order specifics'}
                    </p>
                  </div>
                  {turbineModel === 'SGT-9000HL' && qcContext?.isCriticalZone && (
                    <Badge className="ml-auto text-[10px] bg-red-100 text-red-700 border border-red-200 font-bold">
                      CRITICAL ZONE
                    </Badge>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 block">Task Title *</Label>
                    <Input
                      required
                      placeholder={turbineModel === 'SGT-9000HL'
                        ? 'e.g., Stage 1 Rotor Blade TBC Inspection (9000HL)'
                        : 'e.g., Stage 1 Rotor Blade Visual Inspection (8000H)'}
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2 block">Detailed Description</Label>
                    <Textarea
                      placeholder="Specific instructions, OEM procedure references, safety requirements, tooling, or inspection criteria..."
                      className="min-h-[140px] resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* OEM notice */}
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      OEM Siemens procedures are mandatory and override all template content.
                      {qcContext?.oemProcedure && ` Reference: ${qcContext.oemProcedure}.`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* ── Side panel: scheduling + templates ── */}
              <div className="space-y-4">
                <Card className="p-6 space-y-5">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-foreground">Scheduling</h2>
                      <p className="text-[10px] text-muted-foreground">Assignment & timeline</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onChange={e => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Assign To</Label>
                    <Select
                      value={formData.assignedToId}
                      onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {users?.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2 block">Est. Hours</Label>
                    <Input
                      type="number" min="0" step="0.5" placeholder="e.g. 4.0"
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
                    {deadlineSuggestion && (
                      <button
                        type="button"
                        className="mt-1.5 w-full text-left px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] text-sky-800 hover:bg-sky-100 transition-colors"
                        onClick={() => {
                          const d = new Date(deadlineSuggestion.suggestedDeadline)
                          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
                          setFormData(prev => ({
                            ...prev,
                            deadline: local,
                            estimatedHours: prev.estimatedHours || String(deadlineSuggestion.suggestedDurationHours),
                          }))
                        }}
                      >
                        <span className="font-semibold">Suggested: {deadlineSuggestion.suggestedDurationHours}h</span>
                        {' '}based on {deadlineSuggestion.confidence === 'historical' ? `${deadlineSuggestion.basedOnSamples} historical records` : 'engineering rules'}
                        <span className="text-sky-500 ml-1">— click to apply</span>
                      </button>
                    )}
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

                {/* OEM Template picker */}
                {turbineModel && diagramSectionId && (
                  <TemplatePicker
                    turbineModel={turbineModel}
                    sectionSlug={diagramSectionId as TurbineSectionSlug}
                    onApply={handleApplyTemplate}
                  />
                )}
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  )
}
