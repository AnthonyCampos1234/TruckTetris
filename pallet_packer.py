from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
import numpy as np
from enum import Enum

class LoadingConstraints(Enum):
    TAIL_CLEARANCE = 10  # inches from tail
    SIDE_CLEARANCE = 2   # inches from sides
    WEIGHT_THRESHOLD = 0.6  # 60% of weight should be in front half

@dataclass
class Rectangle:
    width: float
    length: float
    id: str = ""
    weight: float = 0.0  # Weight in pounds
    stackable: bool = True
    product_type: str = ""  # For grouping similar items
    overhang: float = 0.0  # Amount of overhang in inches
    overhang_both_sides: bool = False  # Whether overhang applies to both sides

@dataclass
class PlacedRectangle:
    width: float
    length: float
    x: float
    y: float
    id: str = ""
    weight: float = 0.0
    stackable: bool = True
    product_type: str = ""
    rotated: bool = False
    stack_height: int = 1
    overhang: float = 0.0
    overhang_both_sides: bool = False

class TruckLoadOptimizer:
    def __init__(self, truck_width: float, truck_length: float, max_weight: float):
        self.truck = Rectangle(truck_width, truck_length)
        self.max_weight = max_weight
        self.current_weight = 0.0
        self.front_weight = 0.0  # Weight in front half of truck
        self.placed_pallets: List[PlacedRectangle] = []
        self.skyline: List[Tuple[float, float]] = [(0, 0)]
        
    def calculate_weight_distribution(self) -> float:
        """Calculate the percentage of weight in the front half of the truck."""
        if self.current_weight == 0:
            return 0.0
        return self.front_weight / self.current_weight

    def is_weight_distribution_valid(self, pallet: Rectangle, x: float, y: float) -> bool:
        """Check if placing pallet maintains proper weight distribution."""
        mid_truck = self.truck.length / 2
        weight_in_front = self.front_weight
        
        # Calculate if pallet would be in front half
        if y < mid_truck:
            weight_in_front += pallet.weight
            
        total_weight = self.current_weight + pallet.weight
        if total_weight == 0:
            return True
            
        weight_ratio = weight_in_front / total_weight
        return weight_ratio >= LoadingConstraints.WEIGHT_THRESHOLD.value

    def find_lowest_position(self, pallet: Rectangle, rotated: bool = False) -> Optional[Tuple[float, float]]:
        """Find the lowest possible position considering all constraints including overhang."""
        pallet_width = pallet.length if rotated else pallet.width
        pallet_length = pallet.width if rotated else pallet.length
        
        # Calculate effective width including overhang
        total_width = pallet_width
        if pallet.overhang > 0:
            if pallet.overhang_both_sides:
                total_width += (2 * pallet.overhang)
            else:
                total_width += pallet.overhang
        
        # Apply clearance constraints
        effective_truck_width = self.truck.width - (2 * LoadingConstraints.SIDE_CLEARANCE.value)
        effective_truck_length = self.truck.length - LoadingConstraints.TAIL_CLEARANCE.value
        
        best_x = None
        best_y = float('inf')
        
        for i in range(len(self.skyline)):
            # Calculate x position considering overhang
            x = self.skyline[i][0] + LoadingConstraints.SIDE_CLEARANCE.value
            if pallet.overhang_both_sides:
                x += pallet.overhang  # Shift right to accommodate left overhang
            
            # Check if pallet (including overhang) fits within truck width
            if x + total_width > effective_truck_width:
                continue
                
            max_height = 0
            for j in range(i, len(self.skyline)):
                if self.skyline[j][0] >= x + pallet_width:
                    break
                max_height = max(max_height, self.skyline[j][1])
                
            if (max_height + pallet_length <= effective_truck_length and 
                max_height < best_y and 
                self.is_weight_distribution_valid(pallet, x, max_height)):
                best_y = max_height
                best_x = x
                    
        if best_x is not None:
            return (best_x, best_y)
        return None

    def suggest_optimal_arrangement(self, pallets: List[Rectangle]) -> Dict:
        """Use AI to suggest optimal arrangement based on historical data and constraints."""
        # This would integrate with a machine learning model
        arrangement_metrics = {
            'suggested_sequence': [],
            'estimated_efficiency': 0.0,
            'weight_distribution': 0.0,
            'loading_instructions': []
        }
        
        # Sort pallets based on multiple factors
        sorted_pallets = self.smart_sort_pallets(pallets)
        arrangement_metrics['suggested_sequence'] = sorted_pallets
        
        # Calculate estimated efficiency
        total_area = self.truck.width * self.truck.length
        used_area = sum(p.width * p.length for p in pallets)
        arrangement_metrics['estimated_efficiency'] = used_area / total_area
        
        # Generate loading instructions
        arrangement_metrics['loading_instructions'] = self.generate_loading_instructions(sorted_pallets)
        
        return arrangement_metrics

    def smart_sort_pallets(self, pallets: List[Rectangle]) -> List[Rectangle]:
        """Intelligently sort pallets based on multiple criteria."""
        # Create a scoring function for each pallet
        def pallet_score(pallet: Rectangle) -> float:
            area_score = pallet.width * pallet.length
            weight_score = pallet.weight / self.max_weight
            stackability_score = 1.0 if pallet.stackable else 0.5
            
            # Combine scores with weights
            return (0.4 * area_score + 
                   0.4 * weight_score + 
                   0.2 * stackability_score)
        
        return sorted(pallets, key=pallet_score, reverse=True)

    def generate_loading_instructions(self, pallets: List[Rectangle]) -> List[str]:
        """Generate human-readable loading instructions."""
        instructions = []
        instructions.append("Loading Instructions:")
        instructions.append("1. Start loading from the front of the truck")
        instructions.append("2. Maintain center of gravity by alternating heavy items")
        instructions.append("3. Keep minimum clearance from walls and tail")
        
        # Add specific instructions for each pallet
        for i, pallet in enumerate(pallets, 1):
            instructions.append(
                f"Pallet {pallet.id}: {'Heavy item - ' if pallet.weight > 1000 else ''}"
                f"{'Stack up to 2 high' if pallet.stackable else 'Do not stack'}"
            )
            
        return instructions

    def pack_pallets(self, pallets: List[Rectangle]) -> Tuple[List[PlacedRectangle], Dict]:
        """Pack pallets and return placement info with metrics."""
        # Get AI-suggested arrangement
        optimal_arrangement = self.suggest_optimal_arrangement(pallets)
        
        # Use the suggested sequence for packing
        for pallet in optimal_arrangement['suggested_sequence']:
            if self.current_weight + pallet.weight > self.max_weight:
                print(f"Warning: Cannot load pallet {pallet.id} - Weight limit exceeded")
                continue
                
            if not self.pack_pallet(pallet):
                print(f"Could not pack pallet {pallet.id}")
        
        return self.placed_pallets, optimal_arrangement

    def pack_pallet(self, pallet: Rectangle) -> bool:
        """Try to pack a single pallet, considering overhang."""
        # Try without rotation
        position = self.find_lowest_position(pallet, rotated=False)
        rotated = False
        
        # Try with rotation if normal orientation doesn't work
        if position is None:
            position = self.find_lowest_position(pallet, rotated=True)
            rotated = True
        
        if position is None:
            return False
        
        x, y = position
        actual_width = pallet.length if rotated else pallet.width
        actual_length = pallet.width if rotated else pallet.length
        
        # Update weight tracking
        self.current_weight += pallet.weight
        if y < self.truck.length / 2:
            self.front_weight += pallet.weight
        
        # Place the pallet
        placed_pallet = PlacedRectangle(
            width=pallet.width,
            length=pallet.length,
            x=x,
            y=y,
            id=pallet.id,
            weight=pallet.weight,
            stackable=pallet.stackable,
            product_type=pallet.product_type,
            rotated=rotated,
            overhang=pallet.overhang,
            overhang_both_sides=pallet.overhang_both_sides
        )
        
        self.placed_pallets.append(placed_pallet)
        
        # Update skyline considering the actual pallet width (not including overhang)
        self.update_skyline(x, actual_width, y + actual_length)
        return True

    def update_skyline(self, x: float, width: float, height: float):
        """Update the skyline after placing a pallet."""
        new_skyline: List[Tuple[float, float]] = []
        inserted = False
        
        for i, (sx, sy) in enumerate(self.skyline):
            if sx >= x + width:
                if not inserted:
                    new_skyline.append((x, height))
                    inserted = True
                new_skyline.append((sx, sy))
            elif sx + width <= x:
                new_skyline.append((sx, sy))
            
        if not inserted:
            new_skyline.append((x, height))
        
        self.skyline = new_skyline