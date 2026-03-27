import * as React from "react"

export type TurbineSectionID = 'compressor' | 'mid-frame' | 'turbine' | 'exit-cylinder'

export const SECTION_SLUG_MAP: Record<TurbineSectionID, string> = {
  'compressor': 'Compressor',
  'mid-frame': 'Mid Frame',
  'turbine': 'Turbine',
  'exit-cylinder': 'Turbine Exit Cylinder',
}

const BOUNDARIES = [
  { x: 0,   yTop: 52,  yBot: 258 },
  { x: 380, yTop: 96,  yBot: 214 },
  { x: 545, yTop: 90,  yBot: 220 },
  { x: 760, yTop: 85,  yBot: 225 },
  { x: 960, yTop: 55,  yBot: 255 },
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
    baseColor: 'rgba(56,189,248,0.12)',
    hoverColor: 'rgba(56,189,248,0.30)',
    activeColor: 'rgba(56,189,248,0.50)',
    stroke: '#0284c7',
    glowColor: 'rgba(56,189,248,0.3)',
    labelText: 'Compressor',
  },
  {
    id: 'mid-frame' as TurbineSectionID,
    name: 'Mid Frame',
    x1: 380, x2: 545,
    b1: BOUNDARIES[1], b2: BOUNDARIES[2],
    baseColor: 'rgba(245,158,11,0.12)',
    hoverColor: 'rgba(245,158,11,0.30)',
    activeColor: 'rgba(245,158,11,0.50)',
    stroke: '#d97706',
    glowColor: 'rgba(245,158,11,0.3)',
    labelText: 'Mid Frame',
  },
  {
    id: 'turbine' as TurbineSectionID,
    name: 'Turbine',
    x1: 545, x2: 760,
    b1: BOUNDARIES[2], b2: BOUNDARIES[3],
    baseColor: 'rgba(52,211,153,0.12)',
    hoverColor: 'rgba(52,211,153,0.30)',
    activeColor: 'rgba(52,211,153,0.50)',
    stroke: '#059669',
    glowColor: 'rgba(52,211,153,0.3)',
    labelText: 'Turbine',
  },
  {
    id: 'exit-cylinder' as TurbineSectionID,
    name: 'Exit Cylinder',
    x1: 760, x2: 960,
    b1: BOUNDARIES[3], b2: BOUNDARIES[4],
    baseColor: 'rgba(167,139,250,0.12)',
    hoverColor: 'rgba(167,139,250,0.30)',
    activeColor: 'rgba(167,139,250,0.50)',
    stroke: '#7c3aed',
    glowColor: 'rgba(167,139,250,0.3)',
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

  const compBlades = React.useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const x = 32 + i * 22
      if (x > 360) return null
      const { yTop, yBot } = getYAtX(x)
      const isRotor = i % 2 === 0
      return { x, yTop: yTop + 5, yBot: yBot - 5, isRotor }
    }).filter(Boolean)
  }, [])

  const turbBlades = React.useMemo(() => {
    return [0, 1, 2, 3].map((i) => {
      const x = 570 + i * 51
      const { yTop, yBot } = getYAtX(x)
      return { x, yTop: yTop + 4, yBot: yBot - 4, stage: i + 1 }
    })
  }, [])

  const combustors = [
    { cx: 415, upperCy: 90, lowerCy: 170, rx: 20, ry: 14 },
    { cx: 462, upperCy: 88, lowerCy: 172, rx: 20, ry: 14 },
    { cx: 509, upperCy: 90, lowerCy: 170, rx: 20, ry: 14 },
  ]

  const exitFlowLines = [0.25, 0.5, 0.75].map(t => {
    const x1 = 780, x2 = 940
    const b1 = BOUNDARIES[3], b2 = BOUNDARIES[4]
    const yAt780 = b1.yTop + (b1.yBot - b1.yTop) * t
    const yAt940 = b2.yTop + (b2.yBot - b2.yTop) * t
    return { x1, y1: yAt780, x2, y2: yAt940 }
  })

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
          <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-violet" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── LABEL CALLOUTS ── */}
        {TURBINE_SECTIONS.map(s => {
          const isActive = selectedSectionId === s.id
          const isHovered = hoveredSection === s.id && interactive
          const cx = (s.x1 + s.x2) / 2
          const connY = labelConnectorY(s)
          const labelColor = isActive ? s.stroke : isHovered ? s.stroke : 'rgba(0,0,0,0.40)'
          const fontSize = isActive ? 12 : 10.5
          return (
            <g key={`lbl-${s.id}`} pointerEvents="none">
              {isActive && (
                <rect x={cx - 48} y={5} width={96} height={19} rx={4}
                  fill={s.stroke} opacity="0.12" />
              )}
              <line x1={cx} y1={26} x2={cx} y2={connY - 2}
                stroke={labelColor}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={isActive ? "none" : "3 2"}
                opacity={isActive ? 0.9 : 0.5}
                style={{ transition: 'stroke 0.2s' }} />
              <text x={cx} y={18} textAnchor="middle"
                fill={labelColor}
                fontSize={fontSize}
                fontWeight={isActive ? '800' : '600'}
                fontFamily="'Barlow','Inter',sans-serif"
                letterSpacing="0.07em"
                style={{ transition: 'fill 0.2s, font-size 0.15s', textTransform: 'uppercase' }}>
                {s.labelText}
              </text>
              {isActive && (
                <circle cx={cx} cy={connY - 2} r="3.5" fill={s.stroke} opacity="1" />
              )}
              {isActive && (
                <polygon points={`${cx - 5},3 ${cx + 5},3 ${cx},8`}
                  fill={s.stroke} opacity="0.9" />
              )}
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

        {/* ── SECTION FILLS ── */}
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
              {/* Subtle outer glow — reduced for light bg */}
              {isActive && (
                <>
                  <polygon points={sectionPoly(s)}
                    fill={s.glowColor} stroke={s.stroke} strokeWidth="10"
                    strokeLinejoin="round" opacity="0.08"
                    style={{ filter: 'blur(8px)' }} />
                  <polygon points={sectionPoly(s)}
                    fill="none" stroke={s.stroke} strokeWidth="5"
                    strokeLinejoin="round" opacity="0.10"
                    style={{ filter: 'blur(3px)' }} />
                </>
              )}
              {/* Section fill */}
              <polygon points={sectionPoly(s)}
                fill={fill}
                stroke={isActive ? s.stroke : isHovered ? s.stroke : 'rgba(0,0,0,0.12)'}
                strokeWidth={isActive ? 2.5 : isHovered ? 1.5 : 1}
                strokeLinejoin="round"
                style={{ transition: 'fill 0.15s, stroke 0.15s, stroke-width 0.15s' }} />
              {isActive && (
                <polygon points={sectionPoly(s)}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                  strokeLinejoin="round" />
              )}
            </g>
          )
        })}

        {/* ── COMPRESSOR BLADE ROWS ── */}
        <g clipPath="url(#clip-compressor)" pointerEvents="none">
          {compBlades.map((b, i) => b && (
            <g key={`cb-${i}`}>
              <line x1={b.x} y1={b.yTop} x2={b.x} y2={SHAFT_Y1 - 1}
                stroke={b.isRotor ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.10)'}
                strokeWidth={b.isRotor ? 2 : 1.5} />
              <line x1={b.x} y1={SHAFT_Y2 + 1} x2={b.x} y2={b.yBot}
                stroke={b.isRotor ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.10)'}
                strokeWidth={b.isRotor ? 2 : 1.5} />
              {b.isRotor && (
                <>
                  <circle cx={b.x} cy={SHAFT_Y1 - 4} r="3"
                    fill="rgba(2,132,199,0.20)" stroke="rgba(2,132,199,0.45)" strokeWidth="0.5" />
                  <circle cx={b.x} cy={SHAFT_Y2 + 4} r="3"
                    fill="rgba(2,132,199,0.20)" stroke="rgba(2,132,199,0.45)" strokeWidth="0.5" />
                </>
              )}
            </g>
          ))}
          <text x={16} y={SHAFT_CY + 4} textAnchor="middle"
            fill="rgba(2,132,199,0.55)" fontSize="8" fontFamily="Inter" fontWeight="700"
            transform={`rotate(-90,16,${SHAFT_CY})`}>AIR IN</text>
        </g>

        {/* ── MID-FRAME: COMBUSTOR CANS ── */}
        <g clipPath="url(#clip-mid-frame)" pointerEvents="none">
          {combustors.map((can, i) => (
            <g key={`can-${i}`}>
              <ellipse cx={can.cx} cy={can.upperCy} rx={can.rx} ry={can.ry}
                fill="rgba(245,158,11,0.12)" stroke="rgba(217,119,6,0.45)" strokeWidth="1.5" />
              <ellipse cx={can.cx} cy={can.upperCy} rx={can.rx * 0.5} ry={can.ry * 0.5}
                fill="rgba(234,88,12,0.15)" stroke="rgba(217,119,6,0.25)" strokeWidth="1" />
              <circle cx={can.cx} cy={can.upperCy} r="3" fill="rgba(217,119,6,0.75)" />
              <line x1={can.cx} y1={can.upperCy + can.ry} x2={can.cx} y2={SHAFT_Y1 - 2}
                stroke="rgba(217,119,6,0.25)" strokeWidth="1" strokeDasharray="2,2" />
              <ellipse cx={can.cx} cy={can.lowerCy} rx={can.rx} ry={can.ry}
                fill="rgba(245,158,11,0.12)" stroke="rgba(217,119,6,0.45)" strokeWidth="1.5" />
              <ellipse cx={can.cx} cy={can.lowerCy} rx={can.rx * 0.5} ry={can.ry * 0.5}
                fill="rgba(234,88,12,0.15)" stroke="rgba(217,119,6,0.25)" strokeWidth="1" />
              <circle cx={can.cx} cy={can.lowerCy} r="3" fill="rgba(217,119,6,0.75)" />
              <line x1={can.cx} y1={can.lowerCy - can.ry} x2={can.cx} y2={SHAFT_Y2 + 2}
                stroke="rgba(217,119,6,0.25)" strokeWidth="1" strokeDasharray="2,2" />
            </g>
          ))}
        </g>

        {/* ── TURBINE BLADE ROWS ── */}
        <g clipPath="url(#clip-turbine)" pointerEvents="none">
          {turbBlades.map((b, i) => (
            <g key={`tb-${i}`}>
              <line x1={b.x - 16} y1={b.yTop - 4} x2={b.x - 16} y2={b.yBot + 4}
                stroke="rgba(5,150,105,0.25)" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={b.x} y1={b.yTop} x2={b.x} y2={SHAFT_Y1 - 1}
                stroke="rgba(0,0,0,0.20)" strokeWidth="2.5" />
              <line x1={b.x} y1={SHAFT_Y2 + 1} x2={b.x} y2={b.yBot}
                stroke="rgba(0,0,0,0.20)" strokeWidth="2.5" />
              <circle cx={b.x} cy={SHAFT_Y1 - 5} r="4"
                fill="rgba(5,150,105,0.18)" stroke="rgba(5,150,105,0.45)" strokeWidth="0.5" />
              <circle cx={b.x} cy={SHAFT_Y2 + 5} r="4"
                fill="rgba(5,150,105,0.18)" stroke="rgba(5,150,105,0.45)" strokeWidth="0.5" />
              <text x={b.x - 22} y={SHAFT_CY + 4} textAnchor="middle"
                fill="rgba(5,150,105,0.60)" fontSize="8" fontFamily="Inter" fontWeight="600">
                S{b.stage}
              </text>
            </g>
          ))}
        </g>

        {/* ── EXIT CYLINDER FLOW LINES ── */}
        <g clipPath="url(#clip-exit-cylinder)" pointerEvents="none">
          {exitFlowLines.map((l, i) => (
            <line key={`ef-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(124,58,237,0.30)" strokeWidth="1" strokeDasharray="6,4" />
          ))}
          <text x={948} y={SHAFT_CY + 4} textAnchor="middle"
            fill="rgba(109,40,217,0.50)" fontSize="8" fontFamily="Inter" fontWeight="700"
            transform={`rotate(90,948,${SHAFT_CY})`}>EXHAUST</text>
        </g>

        {/* ── SECTION BOUNDARY LINES ── */}
        {[1, 2, 3].map(i => (
          <line key={`bd-${i}`}
            x1={BOUNDARIES[i].x} y1={BOUNDARIES[i].yTop - 2}
            x2={BOUNDARIES[i].x} y2={BOUNDARIES[i].yBot + 2}
            stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeDasharray="5 3"
            pointerEvents="none" />
        ))}

        {/* ── OUTER CASING PROFILE ── */}
        <polyline
          points={BOUNDARIES.map(b => `${b.x},${b.yTop}`).join(' ')}
          fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinejoin="round"
          pointerEvents="none" />
        <polyline
          points={BOUNDARIES.map(b => `${b.x},${b.yBot}`).join(' ')}
          fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinejoin="round"
          pointerEvents="none" />

        {/* ── INLET/OUTLET FLANGES ── */}
        <rect x="0" y={BOUNDARIES[0].yTop - 2} width="5" height={BOUNDARIES[0].yBot - BOUNDARIES[0].yTop + 4}
          rx="1" fill="rgba(0,0,0,0.20)" pointerEvents="none" />
        <rect x="955" y={BOUNDARIES[4].yTop - 2} width="5" height={BOUNDARIES[4].yBot - BOUNDARIES[4].yTop + 4}
          rx="1" fill="rgba(0,0,0,0.20)" pointerEvents="none" />

        {/* ── CENTRAL SHAFT ── */}
        <rect x="0" y={SHAFT_Y1} width="960" height={SHAFT_Y2 - SHAFT_Y1}
          fill="rgba(71,85,105,0.80)" stroke="rgba(100,116,139,0.5)" strokeWidth="1"
          pointerEvents="none" />
        <rect x="0" y={SHAFT_Y1} width="960" height="5"
          fill="rgba(255,255,255,0.12)" pointerEvents="none" />
        <rect x="0" y={SHAFT_Y2 - 5} width="960" height="5"
          fill="rgba(0,0,0,0.10)" pointerEvents="none" />

        {/* ── ACTIVE SECTION PULSE INDICATOR ── */}
        {TURBINE_SECTIONS.map(s => {
          if (selectedSectionId !== s.id) return null
          const cx = (s.x1 + s.x2) / 2
          const { yTop, yBot } = getYAtX(cx)
          const cy = (yTop + yBot) / 2
          return (
            <g key={`pulse-${s.id}`} pointerEvents="none">
              <circle cx={cx} cy={cy} r="14" fill="none" stroke={s.stroke} strokeWidth="1.5" opacity="0.25">
                <animate attributeName="r" values="14;22;14" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;0;0.25" dur="2.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="8" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.45">
                <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0.05;0.45" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="4" fill={s.stroke} opacity="0.90" />
              <circle cx={cx} cy={cy} r="2" fill="white" opacity="0.8" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
