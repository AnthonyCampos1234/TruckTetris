from typing import List, Tuple, Set, NamedTuple
import numpy as np
from collections import defaultdict
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor
import psutil
import gc

class Rectangle(NamedTuple):
    """Using NamedTuple instead of dataclass for better process compatibility"""
    x: int
    y: int
    w: int
    h: int
    
    def get_coordinates(self) -> Tuple[List[int], List[int]]:
        return [self.x, self.y], [self.x + self.w, self.y + self.h]

def process_chunk(chunk_data: Tuple[List[Rectangle], int, int, List[Tuple[int, int]]]) -> List[List[List[List[int]]]]:
    """Standalone function for multiprocessing compatibility"""
    start_positions, W, H, rectangles = chunk_data
    arrangements = []
    grid = np.zeros((W, H), dtype=np.bool_)
    
    def can_place_rectangle(rect: Rectangle) -> bool:
        if rect.x + rect.w > W or rect.y + rect.h > H:
            return False
        return not np.any(grid[rect.x:rect.x + rect.w, rect.y:rect.y + rect.h])
    
    def place_rectangle(rect: Rectangle, value: bool = True) -> None:
        grid[rect.x:rect.x + rect.w, rect.y:rect.y + rect.h] = value
    
    def get_valid_positions(rect_idx: int) -> List[Rectangle]:
        w, h = rectangles[rect_idx]
        positions = []
        # Normal orientation
        for x in range(W - w + 1):
            for y in range(H - h + 1):
                positions.append(Rectangle(x, y, w, h))
        # Rotated orientation
        if w != h:
            for x in range(W - h + 1):
                for y in range(H - w + 1):
                    positions.append(Rectangle(x, y, h, w))
        return positions
    
    def backtrack(current_rect_idx: int, placed_rectangles: List[Rectangle]) -> None:
        if current_rect_idx == len(rectangles):
            arrangements.append([rect.get_coordinates() for rect in placed_rectangles])
            return
        
        for rect in get_valid_positions(current_rect_idx):
            if can_place_rectangle(rect):
                place_rectangle(rect, True)
                placed_rectangles.append(rect)
                
                backtrack(current_rect_idx + 1, placed_rectangles)
                
                placed_rectangles.pop()
                place_rectangle(rect, False)
    
    for start_pos in start_positions:
        if can_place_rectangle(start_pos):
            place_rectangle(start_pos, True)
            backtrack(1, [start_pos])
            place_rectangle(start_pos, False)
    
    return arrangements

class RectanglePacker:
    def __init__(self, W: int, H: int, rectangles: List[Tuple[int, int]]):
        self.W = W
        self.H = H
        self.rectangles = rectangles
        self.chunk_size = self._calculate_chunk_size()
    
    def _calculate_chunk_size(self) -> int:
        """Calculate optimal chunk size based on available system memory"""
        available_memory = psutil.virtual_memory().available
        estimated_state_size = self.W * self.H * 8  # Size in bytes
        max_chunks = max(1, available_memory // (estimated_state_size * 4))
        return max(1, len(self.rectangles) // max_chunks)
    
    def _get_initial_positions(self) -> List[Rectangle]:
        """Get all valid starting positions for the first rectangle"""
        w, h = self.rectangles[0]
        positions = []
        
        # Normal orientation
        for x in range(self.W - w + 1):
            for y in range(self.H - h + 1):
                positions.append(Rectangle(x, y, w, h))
        
        # Rotated orientation
        if w != h:
            for x in range(self.W - h + 1):
                for y in range(self.H - w + 1):
                    positions.append(Rectangle(x, y, h, w))
        
        return positions
    
    def find_all_arrangements(self) -> List[List[List[List[int]]]]:
        """Find all arrangements using parallel processing"""
        start_positions = self._get_initial_positions()
        
        # Split positions into chunks
        chunks = [
            start_positions[i:i + self.chunk_size]
            for i in range(0, len(start_positions), self.chunk_size)
        ]
        
        # Prepare data for each process
        chunk_data = [
            (chunk, self.W, self.H, self.rectangles)
            for chunk in chunks
        ]
        
        # Process chunks in parallel
        all_arrangements = []
        with ProcessPoolExecutor(max_workers=mp.cpu_count()) as executor:
            try:
                for result in executor.map(process_chunk, chunk_data):
                    all_arrangements.extend(result)
                    gc.collect()
            except Exception as e:
                print(f"Error during parallel processing: {e}")
                # Fallback to single-process execution
                print("Falling back to single-process execution...")
                all_arrangements = []
                for data in chunk_data:
                    all_arrangements.extend(process_chunk(data))
        
        return all_arrangements

def print_arrangements(W: int, H: int, rectangles: List[Tuple[int, int]]) -> None:
    """Print all possible arrangements with memory usage information"""
    initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
    
    print(f"Starting rectangle packing with {mp.cpu_count()} CPU cores")
    print(f"Initial memory usage: {initial_memory:.2f} MB")
    
    try:
        packer = RectanglePacker(W, H, rectangles)
        arrangements = packer.find_all_arrangements()
        
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        if not arrangements:
            print("No valid arrangements found!")
            return
        
        print(f"\nMemory Usage Statistics:")
        print(f"Final Memory: {final_memory:.2f} MB")
        print(f"Memory Increase: {final_memory - initial_memory:.2f} MB")
        
        for i, arrangement in enumerate(arrangements, 1):
            print(f"Possibility {i}:", arrangement)
        
        print(f"\nTotal number of possibilities found: {len(arrangements)}")
        
    except Exception as e:
        print(f"Error during execution: {e}")
        raise

if __name__ == "__main__":
    # Example parameters
    W, H = 8, 8  # Larger rectangle dimensions
    rectangles = [(2, 2), (2, 1), (3,4), (1,1), (6,4)]  # List of (width, height) for smaller rectangles

    print(f"Finding arrangements for rectangles {rectangles}")
    print(f"in a {W}x{H} rectangle:\n")
    
    print_arrangements(W, H, rectangles)