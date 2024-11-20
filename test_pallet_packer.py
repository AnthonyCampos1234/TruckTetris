from pallet_packer import TruckLoadOptimizer, Rectangle
from config import TruckConfig

def test_truck_loading():
    # Create optimizer with standard truck dimensions
    optimizer = TruckLoadOptimizer(
        truck_width=TruckConfig.STANDARD_WIDTH,
        truck_length=TruckConfig.STANDARD_LENGTH,
        max_weight=TruckConfig.MAX_WEIGHT
    )
    
    # Create test pallets with realistic attributes
    pallets = [
        Rectangle(48, 48, "P1", weight=1200, stackable=True, product_type="boxes"),
        Rectangle(36, 48, "P2", weight=800, stackable=True, product_type="boxes"),
        Rectangle(48, 36, "P3", weight=1500, stackable=False, product_type="machinery"),
        Rectangle(24, 24, "P4", weight=400, stackable=True, product_type="boxes"),
    ]
    
    # Pack pallets and get optimization metrics
    placed_pallets, metrics = optimizer.pack_pallets(pallets)
    
    # Print results
    print("\nLoading Results:")
    print("---------------")
    for pallet in placed_pallets:
        print(f"Pallet {pallet.id}:")
        print(f"  Position: ({pallet.x}, {pallet.y})")
        print(f"  {'Rotated' if pallet.rotated else 'Not rotated'}")
        print(f"  Weight: {pallet.weight} lbs")
        print(f"  Stack height: {pallet.stack_height}")
    
    print("\nOptimization Metrics:")
    print("-------------------")
    print(f"Estimated efficiency: {metrics['estimated_efficiency']:.2%}")
    print(f"Weight distribution: {metrics['weight_distribution']:.2%} in front")
    
    print("\nLoading Instructions:")
    print("-------------------")
    for instruction in metrics['loading_instructions']:
        print(instruction)

if __name__ == "__main__":
    test_truck_loading() 