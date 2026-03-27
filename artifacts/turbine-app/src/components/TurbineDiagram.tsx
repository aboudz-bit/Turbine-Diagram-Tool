import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type TurbineSectionID = 'compressor' | 'mid-frame' | 'turbine' | 'exit-cylinder'

export const SECTION_SLUG_MAP: Record<TurbineSectionID, string> = {
  'compressor': 'Compressor',
  'mid-frame': 'Mid Frame',
  'turbine': 'Turbine',
  'exit-cylinder': 'Turbine Exit Cylinder'
}

interface TurbineDiagramProps {
  selectedSectionId?: string | null
  onSelectSection?: (id: TurbineSectionID, name: string) => void
  interactive?: boolean
}

// Map real gas turbine cross-section
export const TURBINE_SECTIONS = [
  { id: 'compressor', name: 'Compressor', color: 'rgba(56, 189, 248, 0.4)', hoverColor: 'rgba(56, 189, 248, 0.6)', activeColor: 'rgba(56, 189, 248, 1)', stroke: '#38bdf8', points: "0,30 280,50 280,150 0,170" },
  { id: 'mid-frame', name: 'Mid Frame', color: 'rgba(245, 158, 11, 0.4)', hoverColor: 'rgba(245, 158, 11, 0.6)', activeColor: 'rgba(245, 158, 11, 1)', stroke: '#f59e0b', points: "280,50 420,50 420,150 280,150" },
  { id: 'turbine', name: 'Turbine', color: 'rgba(52, 211, 153, 0.4)', hoverColor: 'rgba(52, 211, 153, 0.6)', activeColor: 'rgba(52, 211, 153, 1)', stroke: '#34d399', points: "420,50 600,40 600,160 420,150" },
  { id: 'exit-cylinder', name: 'Exit Cylinder', color: 'rgba(167, 139, 250, 0.4)', hoverColor: 'rgba(167, 139, 250, 0.6)', activeColor: 'rgba(167, 139, 250, 1)', stroke: '#a78bfa', points: "600,40 800,20 800,180 600,160" }
]

export function TurbineDiagram({ selectedSectionId, onSelectSection, interactive = true }: TurbineDiagramProps) {
  const [hoveredSection, setHoveredSection] = React.useState<string | null>(null)

  const handleSelect = (id: string, name: string) => {
    if (!interactive) return
    onSelectSection?.(id as TurbineSectionID, name)
  }

  return (
    <div className="w-full select-none">
      <div className="relative w-full aspect-[4/1] min-h-[120px] max-h-[250px] mx-auto filter drop-shadow-2xl">
        <svg 
          viewBox="0 0 800 200" 
          className="w-full h-full drop-shadow-xl overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Main Shaft Line */}
          <line x1="0" y1="100" x2="800" y2="100" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
          
          {/* Decorative Blade Lines for Compressor */}
          {Array.from({ length: 12 }).map((_, i) => {
            const x = 30 + i * 20;
            const topY = 30 + (i * (20 / 12));
            const bottomY = 170 - (i * (20 / 12));
            return (
              <line key={`comp-${i}`} x1={x} y1={topY + 5} x2={x} y2={bottomY - 5} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            )
          })}

          {/* Decorative shapes for Mid Frame (Combustion cans) */}
          {Array.from({ length: 3 }).map((_, i) => (
            <circle key={`mid-${i}`} cx={320 + i * 40} cy="100" r="15" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
          ))}

          {/* Decorative Blade Lines for Turbine */}
          {Array.from({ length: 4 }).map((_, i) => {
            const x1 = 450 + i * 35;
            const x2 = 460 + i * 35;
            const topY = 50 - (i * (10 / 4));
            const bottomY = 150 + (i * (10 / 4));
            return (
              <g key={`turb-${i}`}>
                <line x1={x1} y1={topY + 5} x2={x1} y2={bottomY - 5} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <line x1={x2} y1={topY + 5} x2={x2} y2={bottomY - 5} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              </g>
            )
          })}

          {TURBINE_SECTIONS.map((section) => {
            const isActive = selectedSectionId === section.id;
            const isHovered = hoveredSection === section.id && interactive;
            const fillColor = isActive ? section.activeColor : (isHovered ? section.hoverColor : section.color);

            return (
              <g 
                key={section.id} 
                onClick={() => handleSelect(section.id, section.name)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                {/* Glow effect behind active polygon */}
                {isActive && (
                  <polygon 
                    points={section.points} 
                    fill="none" 
                    stroke={section.stroke} 
                    strokeWidth="8" 
                    filter="blur(8px)" 
                    opacity="0.8"
                  />
                )}
                
                <polygon
                  points={section.points}
                  fill={fillColor}
                  stroke={isActive ? '#fff' : section.stroke}
                  strokeWidth={isActive ? "3" : (isHovered ? "3" : "1")}
                  strokeLinejoin="round"
                  style={{ transition: 'all 0.2s ease', filter: isHovered && !isActive ? `drop-shadow(0 0 4px ${section.stroke})` : 'none' }}
                />
                
                {/* Section Label */}
                <text
                  x={getCenter(section.points).x}
                  y={getCenter(section.points).y}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                  letterSpacing="0.05em"
                  style={{
                    transition: 'all 0.2s ease',
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                    transform: `scale(${isActive ? 1.1 : (isHovered ? 1.05 : 1)})`,
                    transformOrigin: `${getCenter(section.points).x}px ${getCenter(section.points).y}px`,
                    fontWeight: isActive ? 800 : 600
                  }}
                >
                  {section.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Helper to find rough center of polygon string "x,y x,y..."
function getCenter(points: string) {
  const pairs = points.split(' ').map(p => p.split(',').map(Number));
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length
  };
}

