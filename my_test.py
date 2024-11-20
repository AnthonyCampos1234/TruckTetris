from pallet_packer import TruckLoadOptimizer, Rectangle
from config import TruckConfig

# Create the optimizer
optimizer = TruckLoadOptimizer(
    truck_width=TruckConfig.STANDARD_WIDTH,    # 96 inches (8 feet)
    truck_length=TruckConfig.STANDARD_LENGTH,  # 576 inches (48 feet)
    max_weight=TruckConfig.MAX_WEIGHT         # 45000 pounds
)

# Create your pallets
# Rectangle(width, length, id, weight, stackable, product_type)
my_pallets = [
    Rectangle(48, 48, "Pallet1", weight=1000, stackable=True, product_type="boxes"),
    Rectangle(36, 36, "Pallet2", weight=1500, stackable=False, product_type="machinery"),
    Rectangle(24, 48, "Pallet3", weight=800, stackable=True, product_type="boxes"),
    # Add more pallets as needed...
]

# Pack the pallets and get results
placed_pallets, metrics = optimizer.pack_pallets(my_pallets)

# Print the results
print("\nPallet Positions:")
print("----------------")
for pallet in placed_pallets:
    print(f"Pallet {pallet.id}:")
    print(f"  Position: ({pallet.x}, {pallet.y})")
    print(f"  Rotated: {pallet.rotated}")
    print(f"  Weight: {pallet.weight} lbs")

print("\nLoading Instructions:")
print("-------------------")
for instruction in metrics['loading_instructions']:
    print(instruction)

print("\nEfficiency:", f"{metrics['estimated_efficiency']:.2%}") 