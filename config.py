from dataclasses import dataclass

@dataclass
class TruckConfig:
    # Standard truck dimensions (in inches)
    STANDARD_WIDTH = 96  # 8 feet
    STANDARD_LENGTH = 576  # 48 feet
    MAX_WEIGHT = 45000  # pounds
    
    # Safety constraints
    MIN_TAIL_CLEARANCE = 10
    MIN_SIDE_CLEARANCE = 2
    OPTIMAL_WEIGHT_DISTRIBUTION = 0.6  # 60% weight in front
    
    # Stacking rules
    MAX_STACK_HEIGHT = 2
    MIN_SUPPORT_RATIO = 0.8  # 80% support needed for stacking

@dataclass
class ProductRules:
    # Product-specific rules
    FRAGILE_PRODUCTS = ['electronics', 'glass', 'liquids']
    NON_STACKABLE = ['hazardous', 'crushable']
    HEAVY_THRESHOLD = 1000  # pounds 