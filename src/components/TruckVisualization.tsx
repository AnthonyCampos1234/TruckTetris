import React from 'react'

interface TruckVisualizationProps {
  sideView: boolean 
  pallets: {
    x: number 
    y: number 
    width: number 
    height: number 
    label: string 
    color: string 
  }[]
}

export function TruckVisualization({ sideView, pallets }: TruckVisualizationProps) {
  return (
    <div className="relative w-full h-48 border-2 border-gray-400 rounded-lg bg-white">
      <div className="absolute inset-0 p-2">
        <div className="absolute left-0 top-0 h-full w-8 bg-gray-200 border-r border-gray-300" />

        <div className="absolute right-0 top-0 h-full w-1 bg-gray-300" />
        
        {sideView && (
          <div 
            className="absolute left-8 top-0 h-1 w-24 bg-gray-300 transform -rotate-2"
            style={{ transformOrigin: 'left' }}
          />
        )}
        
        {pallets.map((pallet, index) => (
          <div
            key={index}
            className="absolute flex items-center justify-center border border-gray-400 text-xs font-medium"
            style={{
              left: `${pallet.x}%`,
              top: sideView ? `${100 - pallet.y - pallet.height}%` : `${pallet.y}%`,
              width: `${pallet.width}%`,
              height: `${pallet.height}%`,
              backgroundColor: pallet.color,
              opacity: 0.8,
            }}
          >
            {pallet.label}
          </div>
        ))}
      </div>
    </div>
  )
} 