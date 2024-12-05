import React from 'react'

interface TruckVisualizationProps {
  sideView: boolean // true for side view, false for top view
  pallets: {
    x: number // position from front (0-100)
    y: number // position from left (0-100) for top view, height (0-100) for side view
    width: number // width in percentage
    height: number // height in percentage
    label: string // pallet identifier
    color: string // color for the pallet
  }[]
}

export function TruckVisualization({ sideView, pallets }: TruckVisualizationProps) {
  return (
    <div className="relative w-full h-48 border-2 border-gray-400 rounded-lg bg-white">
      {/* Truck outline */}
      <div className="absolute inset-0 p-2">
        {/* Cab indication */}
        <div className="absolute left-0 top-0 h-full w-8 bg-gray-200 border-r border-gray-300" />
        
        {/* Door line */}
        <div className="absolute right-0 top-0 h-full w-1 bg-gray-300" />
        
        {/* Ceiling slope for side view */}
        {sideView && (
          <div 
            className="absolute left-8 top-0 h-1 w-24 bg-gray-300 transform -rotate-2"
            style={{ transformOrigin: 'left' }}
          />
        )}
        
        {/* Pallets */}
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