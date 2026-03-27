import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type TurbineSectionID = 'compressor' | 'mid-frame' | 'turbine' | 'exit-cylinder'

interface TurbineDiagramProps {
  selectedSectionId?: string | null
  onSelectSection?: (id: TurbineSectionID, name: string) => void
  interactive?: boolean
}

// Fallback DB structure for guaranteed UI functioning
export const TURBINE_SECTIONS = [
  { id: 'compressor', name: 'Compressor', color: 'rgba(56, 189, 248, 0.7)', stroke: '#38bdf8', points: "0,30 280,50 280,150 0,170" },
  { id: 'mid-frame', name: 'Mid Frame', color: 'rgba(245, 158, 11, 0.7)', stroke: '#f59e0b', points: "280,50 420,50 420,150 280,150" },
  { id: 'turbine', name: 'Turbine', color: 'rgba(52, 211, 153, 0.7)', stroke: '#34d399', points: "420,50 600,40 600,160 420,150" },
  { id: 'exit-cylinder', name: 'Exit Cylinder', color: 'rgba(167, 139, 250, 0.7)', stroke: '#a78bfa', points: "600,40 800,20 800,180 600,160" }
]

export const STAGES_MOCK = [
  { id: 1, name: 'Stage 1', bladeCount: '80-100' },
  { id: 2, name: 'Stage 2', bladeCount: '70-90' },
  { id: 3, name: 'Stage 3', bladeCount: '60-80' },
  { id: 4, name: 'Stage 4', bladeCount: '50-70' }
]

export const COMPONENTS_MOCK = ['Rotor Blade', 'Stator Vane', 'Seal', 'Casing', 'Shaft']

export function TurbineDiagram({ selectedSectionId, onSelectSection, interactive = true }: TurbineDiagramProps) {
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

          {/* Decorative Blade Lines for Turbine */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = 440 + i * 25;
            const topY = 50 - (i * (10 / 6));
            const bottomY = 150 + (i * (10 / 6));
            return (
              <line key={`turb-${i}`} x1={x} y1={topY + 5} x2={x} y2={bottomY - 5} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            )
          })}

          {TURBINE_SECTIONS.map((section) => {
            const isActive = selectedSectionId === section.id;
            return (
              <g 
                key={section.id} 
                onClick={() => handleSelect(section.id, section.name)}
                className={cn(
                  "turbine-section",
                  interactive && "cursor-pointer",
                  isActive && "active"
                )}
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
                  fill={section.color}
                  stroke={isActive ? '#fff' : section.stroke}
                  strokeWidth={isActive ? "3" : "1"}
                  strokeLinejoin="round"
                  className="transition-all duration-300"
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
                  className={cn(
                    "pointer-events-none transition-all duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
                    isActive ? "text-[16px] font-bold" : ""
                  )}
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
