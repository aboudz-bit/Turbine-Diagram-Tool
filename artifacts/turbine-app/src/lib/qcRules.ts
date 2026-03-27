import type { TurbineModel, TurbineSectionSlug } from './turbineTemplates'

export interface QcRule {
  id: string
  label: string
  mandatory: boolean
  detail?: string
}

export interface QcContext {
  turbineModel: TurbineModel
  sectionSlug: TurbineSectionSlug
  isCriticalZone: boolean
  oemProcedure?: string
  warning?: string
  rules: QcRule[]
}

const QC_CONTEXTS: QcContext[] = [

  // ─── SGT-9000HL ──────────────────────────────────────────────────────────

  {
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'turbine',
    isCriticalZone: true,
    oemProcedure: 'SI-2241-HL',
    warning: 'HIGH TEMPERATURE ZONE — Strict QC required. Stage 1 blades marked CRITICAL. Engineer sign-off mandatory before close-up.',
    rules: [
      { id: 'r1', label: 'Thermal Barrier Coating (TBC) thickness measured at ≥ 5 span positions per blade', mandatory: true, detail: 'Use calibrated eddy-current or fluorescent penetrant probe. Min 0.08 mm, max 0.12 mm.' },
      { id: 'r2', label: 'All cooling holes probed for blockage — no obstruction permitted', mandatory: true, detail: 'Use borescope air-probe or standard wire gauge. Log each hole on blade map.' },
      { id: 'r3', label: 'Blade tip clearance ≤ 0.45 mm — engineer escalation if exceeded', mandatory: true, detail: 'Measure at 0°, 90°, 180°, 270°. Any reading > 0.45 mm requires engineer review before close-up.' },
      { id: 'r4', label: 'TBC spallation > 5 mm² on any blade → blade must be replaced before return to service', mandatory: true, detail: 'Do not return to service under any circumstances. Record blade ID and photograph.' },
      { id: 'r5', label: 'Stage 1 turbine designated CRITICAL ZONE — all findings photographed and logged', mandatory: true },
      { id: 'r6', label: 'Engineer sign-off on FINDINGS LOG before close-up', mandatory: true },
      { id: 'r7', label: 'Trailing edge erosion > 0.3 mm depth → record and flag for engineering review', mandatory: false, detail: 'Not an automatic stop-work, but must be trended against previous inspection.' },
    ],
  },

  {
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'mid-frame',
    isCriticalZone: false,
    oemProcedure: 'SI-1840-HL',
    warning: 'Combustion zone — liner cracking or burnthrough is a stop-work condition. Do not proceed past any crack > 10 mm.',
    rules: [
      { id: 'r1', label: 'Liner crack inspection — no crack > 10 mm permitted (stop-work limit)', mandatory: true, detail: 'Use borescope + calibrated reticle. Crack > 10 mm = stop work, raise NCR, contact OEM.' },
      { id: 'r2', label: 'Dilution hole diameter within drawing limits', mandatory: true, detail: 'Burned-out holes > 31.5 mm must be reported for liner replacement.' },
      { id: 'r3', label: 'Hot spot thermal imaging recorded', mandatory: true, detail: 'Peak temperature > 1250°C → liner replacement mandatory.' },
      { id: 'r4', label: 'Transition piece attachment brackets inspected for cracking', mandatory: true },
      { id: 'r5', label: 'Crossfire tube integrity verified — no blockage or cracking', mandatory: true },
      { id: 'r6', label: 'All findings recorded on combustor map drawing', mandatory: true },
    ],
  },

  {
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'compressor',
    isCriticalZone: false,
    oemProcedure: 'SI-0910-HL',
    warning: 'IGV and VGV actuation must be verified. Fouling Grade ≥ 3 triggers mandatory water wash before return to service.',
    rules: [
      { id: 'r1', label: 'VGV angle deviation ≤ ±0.5° — tighter than standard specification', mandatory: true, detail: 'SGT-9000HL aerodynamic sensitivity requires tighter VGV tolerance than 8000H.' },
      { id: 'r2', label: 'Fouling grade ≥ 3 → mandatory online water wash before return to service', mandatory: true },
      { id: 'r3', label: 'All blade damage photographed and measured', mandatory: true },
      { id: 'r4', label: 'IGV actuation full-range test completed', mandatory: true },
      { id: 'r5', label: 'Anti-icing bleed port inspection', mandatory: false },
    ],
  },

  {
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'exit-cylinder',
    isCriticalZone: false,
    oemProcedure: 'SI-3100-HL',
    warning: 'Exhaust section — confirm unit temperature < 60°C before entry. Asbestos-free insulation blankets must be used.',
    rules: [
      { id: 'r1', label: 'Unit temperature confirmed < 60°C before personnel entry', mandatory: true },
      { id: 'r2', label: 'Diffuser strut crack inspection at all weld joints', mandatory: true },
      { id: 'r3', label: 'Flex seal gap within 0–2 mm nominal range', mandatory: true },
      { id: 'r4', label: 'Turning vane condition recorded', mandatory: false },
    ],
  },

  // ─── SGT-8000H ────────────────────────────────────────────────────────────

  {
    turbineModel: 'SGT-8000H',
    sectionSlug: 'turbine',
    isCriticalZone: false,
    oemProcedure: 'SA-4410',
    warning: 'If unit has > 25,000 EOH since last inspection, blade creep measurement is mandatory.',
    rules: [
      { id: 'r1', label: 'Visual inspection of all accessible blades (minimum 80% coverage)', mandatory: true },
      { id: 'r2', label: 'Blade tip clearance measured at 4 circumferential positions', mandatory: true, detail: 'Nominal 0.50–0.80 mm. Alert > 0.90 mm or < 0.40 mm.' },
      { id: 'r3', label: 'Blade creep elongation measured if > 25,000 EOH since last inspection', mandatory: false, detail: 'Becomes mandatory at > 25k EOH. Alert if elongation > 0.5 mm.' },
      { id: 'r4', label: 'Shroud contact fretting recorded', mandatory: true },
      { id: 'r5', label: 'All findings logged on blade-by-blade sheet', mandatory: true },
    ],
  },

  {
    turbineModel: 'SGT-8000H',
    sectionSlug: 'mid-frame',
    isCriticalZone: false,
    oemProcedure: 'SA-3312',
    warning: 'Lock out fuel system and confirm energy isolation before any combustor access.',
    rules: [
      { id: 'r1', label: 'Energy isolation confirmed before combustor access', mandatory: true },
      { id: 'r2', label: 'DLE burner swirler vane erosion assessed', mandatory: true },
      { id: 'r3', label: 'Crossfire tube integrity verified — no cracks or blockage', mandatory: true },
      { id: 'r4', label: 'Igniter electrode gap within 2.5–3.5 mm', mandatory: true },
      { id: 'r5', label: 'Liner replacement if wall thickness < 2.0 mm', mandatory: false, detail: 'Condition-dependent. Record measurement and trend.' },
    ],
  },

  {
    turbineModel: 'SGT-8000H',
    sectionSlug: 'compressor',
    isCriticalZone: false,
    oemProcedure: 'SA-0810',
    warning: 'Schedule borescope every 4,000 EOH or when inlet filter ΔP exceeds 8 mbar.',
    rules: [
      { id: 'r1', label: 'Fouling grade assessed at representative stages (1, 3, 7)', mandatory: true },
      { id: 'r2', label: 'IGV actuation stiffness check', mandatory: true },
      { id: 'r3', label: 'Anti-icing bleed ports checked — all clear', mandatory: true },
      { id: 'r4', label: 'Online water wash scheduled if fouling Grade ≥ 3', mandatory: false, detail: 'Becomes mandatory if Grade ≥ 3.' },
    ],
  },

  {
    turbineModel: 'SGT-8000H',
    sectionSlug: 'exit-cylinder',
    isCriticalZone: false,
    oemProcedure: 'SA-5100',
    warning: 'Confirm unit temperature < 60°C before exhaust entry.',
    rules: [
      { id: 'r1', label: 'Unit temperature confirmed < 60°C before entry', mandatory: true },
      { id: 'r2', label: 'Diffuser cone cracks inspected at weld zones', mandatory: true },
      { id: 'r3', label: 'Flex seal gap within 0–4 mm', mandatory: true },
      { id: 'r4', label: 'Drain plug condition verified', mandatory: false },
    ],
  },
]

export function getQcContext(
  turbineModel: TurbineModel,
  sectionSlug: TurbineSectionSlug,
): QcContext | null {
  return (
    QC_CONTEXTS.find(
      q => q.turbineModel === turbineModel && q.sectionSlug === sectionSlug,
    ) ?? null
  )
}
