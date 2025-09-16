#!/usr/bin/env python3
"""
Generate test PNG sequence with transparency for testing the merger tool
"""

import os
from PIL import Image, ImageDraw
import numpy as np

def create_test_sequence(output_dir="test_sequence", num_frames=30, width=640, height=480):
    """Generate a simple animated PNG sequence with transparency"""
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating {num_frames} test frames...")
    
    for frame in range(num_frames):
        # Create RGBA image (transparent background)
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Animated circle with varying transparency
        center_x = width // 2
        center_y = height // 2
        
        # Multiple circles with different colors and transparency
        for i in range(3):
            # Calculate position and size
            angle = (frame / num_frames) * 360 + i * 120
            radius = 50 + i * 30
            x = center_x + int(100 * np.cos(np.radians(angle)))
            y = center_y + int(100 * np.sin(np.radians(angle)))
            
            # Color with transparency
            colors = [(255, 100, 100), (100, 255, 100), (100, 100, 255)]
            alpha = int(200 - i * 50)  # Varying transparency
            color = colors[i] + (alpha,)
            
            # Draw circle
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], 
                        fill=color, outline=None)
        
        # Add frame number
        draw.text((10, 10), f"Frame {frame:03d}", fill=(255, 255, 255, 255))
        
        # Save frame
        filename = os.path.join(output_dir, f"frame_{frame:04d}.png")
        img.save(filename)
        
        if frame % 10 == 0:
            print(f"  Generated frame {frame}")
    
    print(f"\nTest sequence created in '{output_dir}/'")
    print(f"Total frames: {num_frames}")
    print(f"Resolution: {width}x{height}")
    print("\nYou can now test the merger with:")
    print(f"  python merge_transparent_video.py -i {output_dir}/ -o test_output.mov")

if __name__ == "__main__":
    try:
        from PIL import Image
        create_test_sequence()
    except ImportError:
        print("Error: Pillow library required for test sequence generation")
        print("Install with: pip install Pillow")
        print("\nAlternatively, you can use your own PNG sequence with the merger tool.")
