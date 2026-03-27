export type TurbineSectionSlug = 'compressor' | 'mid-frame' | 'turbine' | 'exit-cylinder'
export type TurbineModel = 'SGT-9000HL' | 'SGT-8000H'
export type RiskLevel = 'low' | 'medium' | 'elevated' | 'critical'

export interface TaskMeasurement {
  name: string
  unit: string
  nominalRange?: string
  alertThreshold?: string
}

export interface TurbineTemplate {
  id: string
  turbineModel: TurbineModel
  sectionSlug: TurbineSectionSlug
  title: string
  description: string
  riskLevel: RiskLevel
  checklist: string[]
  measurements: TaskMeasurement[]
  note?: string
}

export const TURBINE_TEMPLATES: TurbineTemplate[] = [

  // ─── SGT-9000HL ─────────────────────────────────────────────────────────

  {
    id: '9000hl-t-tbc-inspection',
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'turbine',
    riskLevel: 'critical',
    title: 'Stage 1 Rotor Blade TBC Inspection',
    description:
      'Borescope inspection of Stage 1 rotor blades for Thermal Barrier Coating integrity, cooling hole condition, leading-edge oxidation, and erosion damage. Per OEM SI-2241-HL procedure. All findings must be signed off by a Siemens-certified engineer before close-up.',
    checklist: [
      'Confirm borescope calibration certificate is current',
      'Record blade count and reference mark position',
      'Measure TBC thickness at 5 span positions per blade (root / 25% / 50% / 75% / tip)',
      'Check all cooling holes for blockage using air-probe or borescope probe',
      'Inspect leading edge for oxidation and spallation — photograph each finding',
      'Inspect trailing edge for erosion, nicks, and cracks',
      'Verify platform seal integrity — no step > 0.1 mm',
      'Measure blade tip clearance at 4 circumferential positions',
      'Complete FINDINGS LOG with blade ID, span location, and severity rating',
      'Engineer sign-off required before turbine close-up',
    ],
    measurements: [
      { name: 'TBC Thickness', unit: 'mm', nominalRange: '0.08 – 0.12', alertThreshold: '< 0.05 or > 0.15' },
      { name: 'Blade Tip Clearance', unit: 'mm', nominalRange: '0.25 – 0.45', alertThreshold: '> 0.45 → escalate' },
      { name: 'Leading Edge Radius', unit: 'mm', nominalRange: '0.4 – 0.6', alertThreshold: '< 0.3' },
      { name: 'Cooling Hole Diameter', unit: 'mm', nominalRange: '0.50 – 0.55', alertThreshold: '< 0.45 (blocked)' },
    ],
    note: 'OEM Siemens SI-2241-HL procedures are MANDATORY and override all template defaults.',
  },

  {
    id: '9000hl-t-seal-clearance',
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'turbine',
    riskLevel: 'elevated',
    title: 'Turbine Stage Seal Clearance Measurement',
    description:
      'Precision radial clearance measurement for turbine interstage and shroud seals. Uses calibrated feeler gauges at 4 circumferential positions (0°, 90°, 180°, 270°). Tight clearance specification for SGT-9000HL requires measurement uncertainty < ±0.02 mm.',
    checklist: [
      'Verify feeler gauge calibration — max uncertainty ±0.02 mm',
      'Mark rotor at reference position (0°) before measurement',
      'Measure radial clearance at 0°, 90°, 180°, 270° for each seal',
      'Inspect seal segments for rubbing marks, chipping, and discoloration',
      'Check honeycomb seal wear depth — max 0.5 mm loss allowed',
      'Photograph all rub marks and record arc extent in degrees',
      'Verify labyrinth seal knife edges — no burring allowed',
      'Record ambient temperature during measurement for thermal correction',
    ],
    measurements: [
      { name: 'Radial Seal Clearance (0°)', unit: 'mm', nominalRange: '0.40 – 0.60', alertThreshold: '> 0.65 or < 0.35' },
      { name: 'Radial Seal Clearance (90°)', unit: 'mm', nominalRange: '0.40 – 0.60', alertThreshold: '> 0.65 or < 0.35' },
      { name: 'Radial Seal Clearance (180°)', unit: 'mm', nominalRange: '0.40 – 0.60', alertThreshold: '> 0.65 or < 0.35' },
      { name: 'Radial Seal Clearance (270°)', unit: 'mm', nominalRange: '0.40 – 0.60', alertThreshold: '> 0.65 or < 0.35' },
      { name: 'Honeycomb Wear Depth', unit: 'mm', nominalRange: '0 – 0.30', alertThreshold: '> 0.50' },
    ],
  },

  {
    id: '9000hl-mf-combustor-liner',
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'mid-frame',
    riskLevel: 'elevated',
    title: 'Combustor Liner & Transition Piece Inspection',
    description:
      'Visual and borescope inspection of combustor liner panels, transition pieces, and dilution holes. Check for hot spots, burnthrough, cracking, and panel warping using calibrated thermal imaging. Per OEM SI-1840-HL procedure.',
    checklist: [
      'Drain and lock out fuel system before access',
      'Remove inspection port covers — record torque markings',
      'Visual inspection of all accessible liner panels for hot spot discoloration',
      'Borescope inspection of primary zone and dilution holes',
      'Check transition piece mounting brackets for cracks',
      'Thermal imaging scan of liner outer wall (if accessible)',
      'Measure dilution hole diameters — compare to drawing limits',
      'Inspect crossfire tubes for cracks and blockage',
      'Check liner panel attachment clips and spring clips',
      'Record all findings on combustor map drawing',
    ],
    measurements: [
      { name: 'Liner Wall Thickness (minimum)', unit: 'mm', nominalRange: '≥ 2.0', alertThreshold: '< 1.5 → replace' },
      { name: 'Dilution Hole Diameter', unit: 'mm', nominalRange: '28.0 – 30.0', alertThreshold: '> 31.5 (burned out)' },
      { name: 'Crack Length (max allowable)', unit: 'mm', nominalRange: '0', alertThreshold: '> 10 mm → stop work' },
      { name: 'Hot Spot Peak Temperature', unit: '°C', nominalRange: '< 1150', alertThreshold: '> 1250 → replace' },
    ],
  },

  {
    id: '9000hl-c-igv-borescope',
    turbineModel: 'SGT-9000HL',
    sectionSlug: 'compressor',
    riskLevel: 'medium',
    title: 'IGV and Compressor Borescope Inspection',
    description:
      'Full borescope survey of inlet guide vanes (IGVs), compressor blade stages, and VGV actuator response. Assess fouling grade, airfoil damage, and tip clearance. Covers all accessible stages front to back.',
    checklist: [
      'Verify borescope calibration and image capture system',
      'Inspect IGV leading edges for erosion and nicks',
      'Check VGV actuation — verify full range of motion (IEC 60034-14)',
      'Survey compressor blade stages 1–7 for deposit fouling (0–4 grade scale)',
      'Photograph any erosion, FOD damage, or blade tip contact marks',
      'Check diffuser vanes for cracking and erosion',
      'Inspect bleed valve ports for deposits',
      'Record inlet filter differential pressure reading',
    ],
    measurements: [
      { name: 'VGV Angle Deviation', unit: '°', nominalRange: '±0.5', alertThreshold: '> ±1.0' },
      { name: 'Fouling Grade (0–4 scale)', unit: 'grade', nominalRange: '0 – 1', alertThreshold: '≥ 3 → schedule wash' },
      { name: 'IGV Chord Length Deviation', unit: 'mm', nominalRange: '< 0.5', alertThreshold: '> 1.0' },
    ],
  },

  // ─── SGT-8000H ──────────────────────────────────────────────────────────

  {
    id: '8000h-t-blade-visual',
    turbineModel: 'SGT-8000H',
    sectionSlug: 'turbine',
    riskLevel: 'medium',
    title: 'Stage 1 Rotor Blade Visual Inspection',
    description:
      'Visual and borescope inspection of Stage 1 turbine rotor blades. Check for erosion, leading-edge damage, tip clearance, and blade creep. Standard 25,000 EOH inspection per OEM SA-4410 procedure.',
    checklist: [
      'Record unit hours (EOH) and starts since last inspection',
      'Borescope access via inspection port — do not rotate blades under load',
      'Inspect each blade for leading-edge erosion and nicks',
      'Check blade tip clearance at 4 circumferential positions',
      'Assess blade twist and bowing — compare to reference photographs',
      'Inspect shroud contact surfaces for fretting',
      'Check platform cooling holes (if applicable) for blockage',
      'Record findings on blade-by-blade log sheet',
    ],
    measurements: [
      { name: 'Blade Tip Clearance', unit: 'mm', nominalRange: '0.50 – 0.80', alertThreshold: '> 0.90 or < 0.40' },
      { name: 'Blade Chord (reference)', unit: 'mm', nominalRange: 'Per drawing', alertThreshold: '> 0.5% deviation' },
      { name: 'Creep Elongation', unit: 'mm', nominalRange: '< 0.3', alertThreshold: '> 0.5 → replace' },
    ],
    note: 'OEM SA-4410 procedures are MANDATORY and override all template defaults.',
  },

  {
    id: '8000h-cc-combustion-inspection',
    turbineModel: 'SGT-8000H',
    sectionSlug: 'mid-frame',
    riskLevel: 'medium',
    title: 'Combustion System Routine Inspection',
    description:
      'Inspection of 8 can-annular combustors including DLE burners, crossfire tubes, and igniter assemblies. Standard B-check scope per OEM SA-3312.',
    checklist: [
      'Lock out fuel system and confirm energy isolation',
      'Remove combustor inspection covers — record orientation',
      'Inspect DLE burner condition — check swirler vanes for erosion',
      'Check crossfire tube integrity and connections',
      'Inspect igniter electrodes for erosion and gap',
      'Visual check of combustion can liner for discoloration and distortion',
      'Check liner air holes for blockage or enlargement',
      'Verify seal condition at burner-to-liner interface',
      'Reinstall covers with new gaskets — torque to specification',
    ],
    measurements: [
      { name: 'Igniter Electrode Gap', unit: 'mm', nominalRange: '2.5 – 3.5', alertThreshold: '> 4.0 → replace' },
      { name: 'Combustor Pressure Drop', unit: '% design', nominalRange: '< 3.0', alertThreshold: '> 3.5' },
      { name: 'Liner Wall Thickness', unit: 'mm', nominalRange: '≥ 2.5', alertThreshold: '< 2.0 → replace' },
    ],
  },

  {
    id: '8000h-c-fouling-assessment',
    turbineModel: 'SGT-8000H',
    sectionSlug: 'compressor',
    riskLevel: 'low',
    title: 'Compressor Stage Fouling Assessment',
    description:
      'Borescope assessment of compressor fouling grade and blade surface condition. Scheduled every 4,000 EOH or after inlet filter differential alarm. Determine whether online or crank water wash is required.',
    checklist: [
      'Record inlet filter differential pressure and trend',
      'Borescope inspection of stages 1, 3, and 7 (representative)',
      'Grade fouling severity: 0 (clean) to 4 (heavy)',
      'Inspect IGV actuation for stiffness',
      'Check anti-icing bleed system — all ports clear',
      'If Grade ≥ 3: schedule water wash within 72 hours',
      'Record compressor polytropic efficiency from control system',
    ],
    measurements: [
      { name: 'Fouling Grade (0–4)', unit: 'grade', nominalRange: '0 – 2', alertThreshold: '≥ 3 → water wash required' },
      { name: 'Polytropic Efficiency', unit: '%', nominalRange: '≥ 84', alertThreshold: '< 81 → urgent wash' },
      { name: 'Inlet Filter ΔP', unit: 'mbar', nominalRange: '< 8', alertThreshold: '> 12' },
    ],
  },

  {
    id: '8000h-t-seal-inspection',
    turbineModel: 'SGT-8000H',
    sectionSlug: 'turbine',
    riskLevel: 'medium',
    title: 'Turbine Interstage Seal Inspection',
    description:
      'Inspection and clearance measurement of interstage labyrinth seals. Standard tolerances for SGT-8000H are wider than the high-clearance SGT-9000HL variant. Per OEM SA-4415.',
    checklist: [
      'Measure radial clearance at 4 positions using calibrated feeler gauge',
      'Inspect labyrinth knife edges for burring, rubbing, and wear',
      'Check honeycomb seal — replace if wear depth > 1.0 mm',
      'Record rub marks — photograph and note arc extent',
      'Verify rotor run-out — compare to baseline record',
    ],
    measurements: [
      { name: 'Radial Seal Clearance (0°)', unit: 'mm', nominalRange: '0.50 – 0.80', alertThreshold: '> 0.90 or < 0.40' },
      { name: 'Radial Seal Clearance (180°)', unit: 'mm', nominalRange: '0.50 – 0.80', alertThreshold: '> 0.90 or < 0.40' },
      { name: 'Honeycomb Wear Depth', unit: 'mm', nominalRange: '0 – 0.60', alertThreshold: '> 1.00' },
    ],
  },

  {
    id: '8000h-ed-diffuser-inspection',
    turbineModel: 'SGT-8000H',
    sectionSlug: 'exit-cylinder',
    riskLevel: 'low',
    title: 'Exhaust Diffuser Visual Inspection',
    description:
      'Visual inspection of exhaust diffuser cones, struts, and flex seals. Typically performed during planned outage with unit cooled to < 60°C.',
    checklist: [
      'Confirm unit temperature < 60°C before entry',
      'Inspect inner and outer diffuser cones for cracks and distortion',
      'Check all diffuser struts for cracking at weld joints',
      'Inspect flex seal segments — check for wear and gap compliance',
      'Verify drain plug condition',
      'Photograph all findings for condition monitoring baseline',
    ],
    measurements: [
      { name: 'Flex Seal Gap', unit: 'mm', nominalRange: '0 – 2.0', alertThreshold: '> 4.0' },
      { name: 'Strut Crack Length', unit: 'mm', nominalRange: '0', alertThreshold: '> 5 → stop, call OEM' },
    ],
  },
]

export function getTemplatesForContext(
  turbineModel: TurbineModel,
  sectionSlug: TurbineSectionSlug,
): TurbineTemplate[] {
  return TURBINE_TEMPLATES.filter(
    t => t.turbineModel === turbineModel && t.sectionSlug === sectionSlug,
  )
}

export const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  low:      { label: 'Standard',  color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  medium:   { label: 'Medium',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  elevated: { label: 'Elevated',  color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  critical: { label: 'CRITICAL',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
}
