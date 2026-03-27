import * as React from "react"

export type TurbineSectionID = 'compressor' | 'mid-frame' | 'turbine' | 'exit-cylinder'

export const SECTION_SLUG_MAP: Record<TurbineSectionID, string> = {
  'compressor': 'Compressor',
  'mid-frame': 'Mid Frame',
  'turbine': 'Turbine',
  'exit-cylinder': 'Turbine Exit Cylinder',
}

// Casing profile control points (x, yTop, yBot)
// x: 0 = far left (inlet), 960 = far right (outlet)
// Labels zone y=0..50, diagram zone y=50..270
const BOUNDARIES = [
  { x: 0,   yTop: 52,  yBot: 258 }, // inlet face — large & open
  { x: 380, yTop: 96,  yBot: 214 }, // compressor → mid-frame
  { x: 545, yTop: 90,  yBot: 220 }, // mid-frame → turbine
  { x: 760, yTop: 85,  yBot: 225 }, // turbine → exit
  { x: 960, yTop: 55,  yBot: 255 }, // exit face — wide diffuser
]

const SHAFT_Y1 = 138
const SHAFT_Y2 = 172
const SHAFT_CY = (SHAFT_Y1 + SHAFT_Y2) / 2

function lerpBoundaries(x: number, b1: typeof BOUNDARIES[0], b2: typeof BOUNDARIES[0]) {
  const t = (x - b1.x) / (b2.x - b1.x)
  return {
    yTop: b1.yTop + (b2.yTop - b1.yTop) * t,
    yBot: b1.yBot + (b2.yBot - b1.yBot) * t,
  }
}

function getYAtX(x: number) {
  for (let i = 0; i < BOUNDARIES.length - 1; i++) {
    if (x >= BOUNDARIES[i].x && x <= BOUNDARIES[i + 1].x) {
      return lerpBoundaries(x, BOUNDARIES[i], BOUNDARIES[i + 1])
    }
  }
  return { yTop: 55, yBot: 255 }
}

export const TURBINE_SECTIONS = [
  {
    id: 'compressor' as TurbineSectionID,
    name: 'Compressor',
    x1: 0, x2: 380,
    b1: BOUNDARIES[0], b2: BOUNDARIES[1],
    baseColor: 'rgba(56,189,248,0.14)',
    hoverColor: 'rgba(56,189,248,0.32)',
    activeColor: 'rgba(56,189,248,0.72)',
    stroke: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.5)',
    labelText: 'Compressor',
  },
  {
    id: 'mid-frame' as TurbineSectionID,
    name: 'Mid Frame',
    x1: 380, x2: 545,
    b1: BOUNDARIES[1], b2: BOUNDARIES[2],
    baseColor: 'rgba(245,158,11,0.14)',
    hoverColor: 'rgba(245,158,11,0.32)',
    activeColor: 'rgba(245,158,11,0.72)',
    stroke: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.5)',
    labelText: 'Mid Frame',
  },
  {
    id: 'turbine' as TurbineSectionID,
    name: 'Turbine',
    x1: 545, x2: 760,
    b1: BOUNDARIES[2], b2: BOUNDARIES[3],
    baseColor: 'rgba(52,211,153,0.14)',
    hoverColor: 'rgba(52,211,153,0.32)',
    activeColor: 'rgba(52,211,153,0.72)',
    stroke: '#34d399',
    glowColor: 'rgba(52,211,153,0.5)',
    labelText: 'Turbine',
  },
  {
    id: 'exit-cylinder' as TurbineSectionID,
    name: 'Exit Cylinder',
    x1: 760, x2: 960,
    b1: BOUNDARIES[3], b2: BOUNDARIES[4],
    baseColor: 'rgba(167,139,250,0.14)',
    hoverColor: 'rgba(167,139,250,0.32)',
    activeColor: 'rgba(167,139,250,0.72)',
    stroke: '#a78bfa',
    glowColor: 'rgba(167,139,250,0.5)',
    labelText: 'Exit Cylinder',
  },
]

function sectionPoly(s: typeof TURBINE_SECTIONS[0]) {
  return `${s.x1},${s.b1.yTop} ${s.x2},${s.b2.yTop} ${s.x2},${s.b2.yBot} ${s.x1},${s.b1.yBot}`
}

interface TurbineDiagramProps {
  selectedSectionId?: string | null
  onSelectSection?: (id: TurbineSectionID, name: string) => void
  interactive?: boolean
}

export function TurbineDiagram({ selectedSectionId, onSelectSection, interactive = true }: TurbineDiagramProps) {
  const [hoveredSection, setHoveredSection] = React.useState<string | null>(null)

  const handleSelect = (id: TurbineSectionID, name: string) => {
    if (!interactive) return
    onSelectSection?.(id, name)
  }

  // ── Compressor blade rows (rotor/stator pairs) ──
  const compBlades = React.useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const x = 32 + i * 22
      if (x > 360) return null
      const { yTop, yBot } = getYAtX(x)
      const isRotor = i % 2 === 0
      return { x, yTop: yTop + 5, yBot: yBot - 5, isRotor }
    }).filter(Boolean)
  }, [])

  // ── Turbine blade rows (4 stages) ──
  const turbBlades = React.useMemo(() => {
    return [0, 1, 2, 3].map((i) => {
      const x = 570 + i * 51
      const { yTop, yBot } = getYAtX(x)
      return { x, yTop: yTop + 4, yBot: yBot - 4, stage: i + 1 }
    })
  }, [])

  // ── Mid-frame combustor can positions ──
  const combustors = [
    { cx: 415, upperCy: 90, lowerCy: 170, rx: 20, ry: 14 },
    { cx: 462, upperCy: 88, lowerCy: 172, rx: 20, ry: 14 },
    { cx: 509, upperCy: 90, lowerCy: 170, rx: 20, ry: 14 },
  ]

  // ── Exit flow lines ──
  const exitFlowLines = [0.25, 0.5, 0.75].map(t => {
    const x1 = 780, x2 = 940
    const b1 = BOUNDARIES[3], b2 = BOUNDARIES[4]
    const yAt780 = b1.yTop + (b1.yBot - b1.yTop) * t
    const yAt940 = b2.yTop + (b2.yBot - b2.yTop) * t
    return { x1, y1: yAt780, x2, y2: yAt940 }
  })

  // ── Label callout y (above casing by 4px) ──
  function labelConnectorY(s: typeof TURBINE_SECTIONS[0]) {
    const cx = (s.x1 + s.x2) / 2
    const { yTop } = getYAtX(cx)
    return yTop - 4
  }

  return (
    <div className="w-full select-none">
      <svg
        viewBox="0 0 960 280"
        className="w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        <defs>
          {TURBINE_SECTIONS.map(s => (
            <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
              <polygon points={sectionPoly(s)} />
            </clipPath>
          ))}
          <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-violet" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="9" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── LABEL CALLOUTS ── */}
        {TURBINE_SECTIONS.map(s => {
          const isActive = selectedSectionId === s.id
          const isHovered = hoveredSection === s.id && interactive
          const cx = (s.x1 + s.x2) / 2
          const connY = labelConnectorY(s)
          const labelColor = isActive ? s.stroke : isHovered ? s.stroke : 'rgba(255,255,255,0.35)'
          const fontSize = isActive ? 12 : 10.5
          return (
            <g key={`lbl-${s.id}`} pointerEvents="none">
              {/* Active: bright pill background behind label */}
              {isActive && (
                <rect x={cx - 48} y={5} width={96} height={19} rx={4}
                  fill={s.stroke} opacity="0.18" />
              )}
              {/* Connector line */}
              <line x1={cx} y1={26} x2={cx} y2={connY - 2}
                stroke={labelColor}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={isActive ? "none" : "3 2"}
                opacity={isActive ? 0.9 : 0.7}
                style={{ transition: 'stroke 0.2s' }} />
              {/* Label text */}
              <text x={cx} y={18} textAnchor="middle"
                fill={labelColor}
                fontSize={fontSize}
                fontWeight={isActive ? '800' : '500'}
                fontFamily="'Barlow','Inter',sans-serif"
                letterSpacing="0.07em"
                style={{ transition: 'fill 0.2s, font-size 0.15s', textTransform: 'uppercase' }}>
                {s.labelText}
              </text>
              {/* Active: solid dot at junction */}
              {isActive && (
                <circle cx={cx} cy={connY - 2} r="3.5" fill={s.stroke} opacity="1" />
              )}
              {/* Active: selection chevron indicator above label */}
              {isActive && (
                <polygon points={`${cx - 5},3 ${cx + 5},3 ${cx},8`}
                  fill={s.stroke} opacity="0.9" />
              )}
              {/* Active: "✓" check mark after label text */}
              {isActive && (
                <text x={cx + 44} y={19} textAnchor="start"
                  fill={s.stroke}
                  fontSize={10}
                  fontWeight="900"
                  fontFamily="'Barlow','Inter',sans-serif"
                  opacity="0.9">✓</text>
              )}
            </g>
          )
        })}

        {/* ── SECTION FILLS (interactive) ── */}
        {TURBINE_SECTIONS.map(s => {
          const isActive = selectedSectionId === s.id
          const isHovered = hoveredSection === s.id && interactive
          const fill = isActive ? s.activeColor : isHovered ? s.hoverColor : s.baseColor
          return (
            <g key={s.id}
              onClick={() => handleSelect(s.id, s.name)}
              onMouseEnter={() => interactive && setHoveredSection(s.id)}
              onMouseLeave={() => interactive && setHoveredSection(null)}
              style={{ cursor: interactive ? 'pointer' : 'default' }}>
              {/* Outer diffuse glow (active only) — two layers for depth */}
              {isActive && (
                <>
                  <polygon points={sectionPoly(s)}
                    fill={s.glowColor} stroke={s.stroke} strokeWidth="18"
                    strokeLinejoin="round" opacity="0.25"
                    style={{ filter: 'blur(14px)' }} />
                  <polygon points={sectionPoly(s)}
                    fill="none" stroke={s.stroke} strokeWidth="8"
                    strokeLinejoin="round" opacity="0.18"
                    style={{ filter: 'blur(4px)' }} />
                </>
              )}
              {/* Section fill */}
              <polygon points={sectionPoly(s)}
                fill={fill}
                stroke={isActive ? s.stroke : isHovered ? s.stroke : 'rgba(255,255,255,0.15)'}
                strokeWidth={isActive ? 3.5 : isHovered ? 2 : 1}
                strokeLinejoin="round"
                style={{ transition: 'fill 0.15s, stroke 0.15s, stroke-width 0.15s' }} />
              {/* Active: bright inner border inset */}
              {isActive && (
                <polygon points={sectionPoly(s)}
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="2"
                  strokeLinejoin="round" />
              )}
            </g>
          )
        })}

        {/* ── COMPRESSOR BLADE ROWS ── */}
        <g clipPath="url(#clip-compressor)" pointerEvents="none">
          {compBlades.map((b, i) => b && (
            <g key={`cb-${i}`}>
              {/* Upper blade */}
              <line x1={b.x} y1={b.yTop} x2={b.x} y2={SHAFT_Y1 - 1}
                stroke={b.isRotor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={b.isRotor ? 2 : 1.5} />
              {/* Lower blade */}
              <line x1={b.x} y1={SHAFT_Y2 + 1} x2={b.x} y2={b.yBot}
                stroke={b.isRotor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={b.isRotor ? 2 : 1.5} />
              {/* Rotor disc caps */}
              {b.isRotor && (
                <>
                  <circle cx={b.x} cy={SHAFT_Y1 - 4} r="3"
                    fill="rgba(56,189,248,0.25)" stroke="rgba(56,189,248,0.4)" strokeWidth="0.5" />
                  <circle cx={b.x} cy={SHAFT_Y2 + 4} r="3"
                    fill="rgba(56,189,248,0.25)" stroke="rgba(56,189,248,0.4)" strokeWidth="0.5" />
                </>
              )}
            </g>
          ))}
          {/* Inlet arrow */}
          <text x={16} y={SHAFT_CY + 4} textAnchor="middle"
            fill="rgba(56,189,248,0.4)" fontSize="8" fontFamily="Inter" fontWeight="700"
            transform={`rotate(-90,16,${SHAFT_CY})`}>AIR IN</text>
        </g>

        {/* ── MID-FRAME: COMBUSTOR CANS ── */}
        <g clipPath="url(#clip-mid-frame)" pointerEvents="none">
          {combustors.map((can, i) => (
            <g key={`can-${i}`}>
              {/* Upper can */}
              <ellipse cx={can.cx} cy={can.upperCy} rx={can.rx} ry={can.ry}
                fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.35)" strokeWidth="1.5" />
              <ellipse cx={can.cx} cy={can.upperCy} rx={can.rx * 0.5} ry={can.ry * 0.5}
                fill="rgba(255,100,0,0.15)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <circle cx={can.cx} cy={can.upperCy} r="3" fill="rgba(245,158,11,0.7)" />
              {/* Fuel line */}
              <line x1={can.cx} y1={can.upperCy + can.ry} x2={can.cx} y2={SHAFT_Y1 - 2}
                stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="2,2" />
              {/* Lower can (mirror) */}
              <ellipse cx={can.cx} cy={can.lowerCy} rx={can.rx} ry={can.ry}
                fill="rgba(245,158,11,0.12)" stroke="rgba(245,158,11,0.35)" strokeWidth="1.5" />
              <ellipse cx={can.cx} cy={can.lowerCy} rx={can.rx * 0.5} ry={can.ry * 0.5}
                fill="rgba(255,100,0,0.15)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <circle cx={can.cx} cy={can.lowerCy} r="3" fill="rgba(245,158,11,0.7)" />
              <line x1={can.cx} y1={can.lowerCy - can.ry} x2={can.cx} y2={SHAFT_Y2 + 2}
                stroke="rgba(245,158,11,0.2)" strokeWidth="1" strokeDasharray="2,2" />
            </g>
          ))}
        </g>

        {/* ── TURBINE BLADE ROWS ── */}
        <g clipPath="url(#clip-turbine)" pointerEvents="none">
          {turbBlades.map((b, i) => (
            <g key={`tb-${i}`}>
              {/* Stage divider */}
              <line x1={b.x - 16} y1={b.yTop - 4} x2={b.x - 16} y2={b.yBot + 4}
                stroke="rgba(52,211,153,0.18)" strokeWidth="1" strokeDasharray="3,3" />
              {/* Upper blade */}
              <line x1={b.x} y1={b.yTop} x2={b.x} y2={SHAFT_Y1 - 1}
                stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
              {/* Lower blade */}
              <line x1={b.x} y1={SHAFT_Y2 + 1} x2={b.x} y2={b.yBot}
                stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
              {/* Rotor disc cap */}
              <circle cx={b.x} cy={SHAFT_Y1 - 5} r="4"
                fill="rgba(52,211,153,0.2)" stroke="rgba(52,211,153,0.4)" strokeWidth="0.5" />
              <circle cx={b.x} cy={SHAFT_Y2 + 5} r="4"
                fill="rgba(52,211,153,0.2)" stroke="rgba(52,211,153,0.4)" strokeWidth="0.5" />
              {/* Stage label */}
              <text x={b.x - 22} y={SHAFT_CY + 4} textAnchor="middle"
                fill="rgba(52,211,153,0.45)" fontSize="8" fontFamily="Inter" fontWeight="600">
                S{b.stage}
              </text>
            </g>
          ))}
        </g>

        {/* ── EXIT CYLINDER FLOW LINES ── */}
        <g clipPath="url(#clip-exit-cylinder)" pointerEvents="none">
          {exitFlowLines.map((l, i) => (
            <line key={`ef-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(167,139,250,0.15)" strokeWidth="1" strokeDasharray="6,4" />
          ))}
          <text x={948} y={SHAFT_CY + 4} textAnchor="middle"
            fill="rgba(167,139,250,0.35)" fontSize="8" fontFamily="Inter" fontWeight="700"
            transform={`rotate(90,948,${SHAFT_CY})`}>EXHAUST</text>
        </g>

        {/* ── SECTION BOUNDARY LINES ── */}
        {[1, 2, 3].map(i => (
          <line key={`bd-${i}`}
            x1={BOUNDARIES[i].x} y1={BOUNDARIES[i].yTop - 2}
            x2={BOUNDARIES[i].x} y2={BOUNDARIES[i].yBot + 2}
            stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="5 3"
            pointerEvents="none" />
        ))}

        {/* ── OUTER CASING PROFILE ── */}
        <polyline
          points={BOUNDARIES.map(b => `${b.x},${b.yTop}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round"
          pointerEvents="none" />
        <polyline
          points={BOUNDARIES.map(b => `${b.x},${b.yBot}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round"
          pointerEvents="none" />

        {/* ── INLET/OUTLET FLANGES ── */}
        <rect x="0" y={BOUNDARIES[0].yTop - 2} width="5" height={BOUNDARIES[0].yBot - BOUNDARIES[0].yTop + 4}
          rx="1" fill="rgba(255,255,255,0.25)" pointerEvents="none" />
        <rect x="955" y={BOUNDARIES[4].yTop - 2} width="5" height={BOUNDARIES[4].yBot - BOUNDARIES[4].yTop + 4}
          rx="1" fill="rgba(255,255,255,0.25)" pointerEvents="none" />

        {/* ── CENTRAL SHAFT ── */}
        <rect x="0" y={SHAFT_Y1} width="960" height={SHAFT_Y2 - SHAFT_Y1}
          fill="rgba(30,41,59,0.95)" stroke="rgba(100,116,139,0.5)" strokeWidth="1"
          pointerEvents="none" />
        {/* Shaft top highlight */}
        <rect x="0" y={SHAFT_Y1} width="960" height="5"
          fill="rgba(148,163,184,0.12)" pointerEvents="none" />
        {/* Shaft bottom shadow */}
        <rect x="0" y={SHAFT_Y2 - 5} width="960" height="5"
          fill="rgba(0,0,0,0.15)" pointerEvents="none" />

        {/* ── ACTIVE SECTION PULSE INDICATOR ── */}
        {TURBINE_SECTIONS.map(s => {
          if (selectedSectionId !== s.id) return null
          const cx = (s.x1 + s.x2) / 2
          const { yTop, yBot } = getYAtX(cx)
          const cy = (yTop + yBot) / 2
          return (
            <g key={`pulse-${s.id}`} pointerEvents="none">
              {/* Outer slow ring */}
              <circle cx={cx} cy={cy} r="14" fill="none" stroke={s.stroke} strokeWidth="1.5" opacity="0.35">
                <animate attributeName="r" values="14;22;14" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="2.8s" repeatCount="indefinite" />
              </circle>
              {/* Inner faster ring */}
              <circle cx={cx} cy={cy} r="8" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.6">
                <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Core dot */}
              <circle cx={cx} cy={cy} r="4" fill={s.stroke} opacity="0.95" />
              <circle cx={cx} cy={cy} r="2" fill="white" opacity="0.8" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
