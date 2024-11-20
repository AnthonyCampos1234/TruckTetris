from pallet_packer import TruckLoadOptimizer, Rectangle
from config import TruckConfig

def create_truck_visualization(truck_width, truck_length, placed_pallets):
    """Create a visual representation of the truck loading pattern using box characters."""
    SCALE_FACTOR = 8  # Each cell represents 8 inches
    width_cells = int(truck_width / SCALE_FACTOR)
    length_cells = int(truck_length / SCALE_FACTOR)
    
    # Create empty truck layout
    truck_layout = [[' ' for _ in range(width_cells)] for _ in range(length_cells)]
    
    # Box drawing characters
    TOP_LEFT = '┌'
    TOP_RIGHT = '┐'
    BOTTOM_LEFT = '└'
    BOTTOM_RIGHT = '┘'
    HORIZONTAL = '─'
    VERTICAL = '│'
    
    # Add pallets to visualization
    for pallet in placed_pallets:
        # Convert coordinates to grid positions
        x_pos = int(pallet.x / SCALE_FACTOR)
        y_pos = int(pallet.y / SCALE_FACTOR)
        width = int(pallet.width / SCALE_FACTOR)
        length = int(pallet.length / SCALE_FACTOR)
        
        # Draw the rectangle for each pallet
        for y in range(y_pos, min(y_pos + length, length_cells)):
            for x in range(x_pos, min(x_pos + width, width_cells)):
                # Corners
                if y == y_pos and x == x_pos:
                    truck_layout[y][x] = TOP_LEFT
                elif y == y_pos and x == x_pos + width - 1:
                    truck_layout[y][x] = TOP_RIGHT
                elif y == y_pos + length - 1 and x == x_pos:
                    truck_layout[y][x] = BOTTOM_LEFT
                elif y == y_pos + length - 1 and x == x_pos + width - 1:
                    truck_layout[y][x] = BOTTOM_RIGHT
                # Edges
                elif y == y_pos or y == y_pos + length - 1:
                    truck_layout[y][x] = HORIZONTAL
                elif x == x_pos or x == x_pos + width - 1:
                    truck_layout[y][x] = VERTICAL
                # Inside
                else:
                    truck_layout[y][x] = ' '
        
        # Add overhang markers if present
        if pallet.overhang > 0:
            for y in range(y_pos, min(y_pos + length, length_cells)):
                if pallet.overhang_both_sides:
                    if x_pos > 0:
                        truck_layout[y][x_pos-1] = '>'
                    if x_pos + width < width_cells:
                        truck_layout[y][x_pos+width] = '>'
                else:
                    if x_pos + width < width_cells:
                        truck_layout[y][x_pos+width] = '>'
    
    # Create the visualization string
    visualization = "\nTruck Loading Visualization (1 cell = 8 inches):\n"
    visualization += "=" * (width_cells + 2) + "\n"
    visualization += "Legend: > = overhang, └┘┌┐ = pallet borders\n"
    
    # Add the layout with borders
    for row in truck_layout:
        visualization += "|" + "".join(row) + "|\n"
    
    visualization += "=" * (width_cells + 2) + "\n"
    visualization += "Front of truck at top\n"
    return visualization

def test_actual_order():
    # Initialize the optimizer with standard truck dimensions
    optimizer = TruckLoadOptimizer(
        truck_width=TruckConfig.STANDARD_WIDTH,    # 96 inches
        truck_length=TruckConfig.STANDARD_LENGTH,  # 576 inches
        max_weight=TruckConfig.MAX_WEIGHT         # 45000 pounds
    )

    # Create pallets with overhang details from spreadsheet
    order_pallets = [
        Rectangle(
            width=40,
            length=48,
            id="P1-10202638",
            weight=2400,
            stackable=True,
            product_type="boxes",
            overhang=3.0,
            overhang_both_sides=True
        ),
        Rectangle(
            width=40,
            length=48,
            id="P2-10202644",
            weight=280,
            stackable=True,
            product_type="boxes",
            overhang=4.0,
            overhang_both_sides=False
        ),
        Rectangle(
            width=40,
            length=48,
            id="P3-10195777",
            weight=140,
            stackable=True,
            product_type="boxes",
            overhang=6.5,
            overhang_both_sides=False
        ),
        Rectangle(
            width=40,
            length=48,
            id="P4-10202640",
            weight=600,
            stackable=True,
            product_type="boxes",
            overhang=4.0,
            overhang_both_sides=False
        ),
        Rectangle(
            width=40,
            length=48,
            id="P5-10202645",
            weight=280,
            stackable=True,
            product_type="boxes",
            overhang=6.0,
            overhang_both_sides=True
        ),
        Rectangle(
            width=40,
            length=48,
            id="P6-10195772",
            weight=560,
            stackable=True,
            product_type="boxes",
            overhang=6.0,
            overhang_both_sides=True
        ),
        Rectangle(
            width=40,
            length=48,
            id="P7-10202643",
            weight=280,
            stackable=True,
            product_type="boxes",
            overhang=5.0,
            overhang_both_sides=True
        ),
        Rectangle(
            width=40,
            length=48,
            id="P8-10195776",
            weight=140,
            stackable=True,
            product_type="boxes",
            overhang=4.0,
            overhang_both_sides=False
        ),
    ]

    # Pack the pallets and get results
    placed_pallets, metrics = optimizer.pack_pallets(order_pallets)

    # Create visualization
    truck_viz = create_truck_visualization(
        TruckConfig.STANDARD_WIDTH,
        TruckConfig.STANDARD_LENGTH,
        placed_pallets
    )

    # Print detailed results
    print("\nOrder Loading Plan")
    print("=================")
    
    # Add visualization to output
    print(truck_viz)
    
    print(f"\nTotal Pallets: {len(placed_pallets)}")
    
    print("\nPallet Placement Details:")
    print("-----------------------")
    for pallet in placed_pallets:
        print(f"\nPallet {pallet.id}:")
        print(f"  Dimensions: {pallet.width}\" x {pallet.length}\"")
        print(f"  Position: ({pallet.x}\", {pallet.y}\")")
        print(f"  Weight: {pallet.weight} lbs")
        print(f"  {'ROTATED' if pallet.rotated else 'NOT ROTATED'}")

    print("\nLoading Metrics:")
    print("---------------")
    print(f"Space Efficiency: {metrics['estimated_efficiency']:.2%}")
    print(f"Weight Distribution: {metrics['weight_distribution']:.2%} in front")
    
    print("\nLoading Instructions:")
    print("-------------------")
    for instruction in metrics['loading_instructions']:
        print(instruction)

    # Print total weight
    total_weight = sum(pallet.weight for pallet in placed_pallets)
    print(f"\nTotal Load Weight: {total_weight} lbs")

if __name__ == "__main__":
    test_actual_order() 