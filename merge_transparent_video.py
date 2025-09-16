#!/usr/bin/env python3
"""
Transparent Video Merger Tool
Merges PNG sequences with alpha channel into transparent videos
"""

import argparse
import os
import sys
import subprocess
import re
from pathlib import Path


def find_sequence_pattern(directory, prefix=""):
    """
    Auto-detect PNG sequence pattern in directory
    Returns: (pattern, start_frame, end_frame, padding)
    """
    png_files = sorted([f for f in os.listdir(directory) if f.endswith('.png')])
    
    if not png_files:
        return None, None, None, None
    
    # Try to detect numbering pattern
    for file in png_files[:5]:  # Check first few files
        # Look for number patterns like image001.png, frame_0001.png, etc.
        match = re.search(r'(\d+)\.png$', file)
        if match:
            number = match.group(1)
            padding = len(number)
            prefix = file[:match.start(1)]
            
            # Verify pattern works for all files
            start_num = int(number)
            end_num = start_num
            
            for f in png_files:
                if f.startswith(prefix) and f.endswith('.png'):
                    num_match = re.search(r'(\d+)\.png$', f)
                    if num_match:
                        num = int(num_match.group(1))
                        start_num = min(start_num, num)
                        end_num = max(end_num, num)
            
            pattern = f"{prefix}%0{padding}d.png"
            return pattern, start_num, end_num, padding
    
    return None, None, None, None


def validate_sequence(directory, pattern, start, end):
    """Check if all expected files exist"""
    missing = []
    for i in range(start, end + 1):
        filepath = os.path.join(directory, pattern % i)
        if not os.path.exists(filepath):
            missing.append(filepath)
    return missing


def merge_png_sequence(input_pattern, output_file, fps=24, codec='prores_ks', 
                      start_number=None, vframes=None, preset=None):
    """
    Merge PNG sequence into video with alpha channel
    
    Args:
        input_pattern: Path pattern like 'path/to/image_%04d.png'
        output_file: Output video path
        fps: Frame rate (default 24)
        codec: Video codec (default 'prores_ks' for ProRes 4444)
        start_number: Starting frame number
        vframes: Number of frames to process
        preset: Encoding preset for certain codecs
    """
    
    # Build FFmpeg command
    cmd = ['ffmpeg', '-y']  # -y to overwrite output
    
    # Input options
    cmd.extend(['-framerate', str(fps)])
    
    if start_number is not None:
        cmd.extend(['-start_number', str(start_number)])
    
    cmd.extend(['-i', input_pattern])
    
    # Video codec options
    if codec == 'gif':
        # For GIF, we need a two-pass process
        import tempfile
        palette_file = tempfile.mktemp(suffix='.png')
        
        # First pass: generate palette
        palette_cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps),
            '-i', input_pattern,
            '-vf', f'fps={fps},scale=640:-1:flags=lanczos,palettegen=stats_mode=diff:transparency_color=ffffff',
            palette_file
        ]
        
        if start_number is not None:
            palette_cmd.insert(3, '-start_number')
            palette_cmd.insert(4, str(start_number))
        
        print("Generating palette for optimized GIF...")
        subprocess.run(palette_cmd, check=True)
        
        # Second pass: create GIF using palette
        cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps)
        ]
        
        if start_number is not None:
            cmd.extend(['-start_number', str(start_number)])
            
        cmd.extend([
            '-i', input_pattern,
            '-i', palette_file,
            '-lavfi', f'fps={fps},scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
            '-gifflags', '+transdiff'
        ])
        
        # Clean up palette file after use
        import atexit
        atexit.register(lambda: os.remove(palette_file) if os.path.exists(palette_file) else None)
        
    elif codec == 'prores_ks':
        # ProRes 4444 with alpha
        cmd.extend(['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le'])
    elif codec == 'qtrle':
        # QuickTime Animation codec
        cmd.extend(['-c:v', 'qtrle'])
    elif codec == 'vp9':
        # VP9 with alpha in WebM
        cmd.extend(['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p'])
        if preset:
            cmd.extend(['-deadline', preset])
    elif codec == 'vp8':
        # VP8 with alpha in WebM
        cmd.extend(['-c:v', 'libvpx', '-pix_fmt', 'yuva420p'])
    elif codec == 'png':
        # PNG video (lossless but large)
        cmd.extend(['-c:v', 'png'])
    else:
        # Custom codec
        cmd.extend(['-c:v', codec])
    
    # Frame limit if specified
    if vframes:
        cmd.extend(['-vframes', str(vframes)])
    
    # Output file
    cmd.append(output_file)
    
    print(f"Running command: {' '.join(cmd)}")
    
    try:
        # Run FFmpeg with real-time output
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, 
                                 stderr=subprocess.STDOUT, universal_newlines=True)
        
        # Print output in real-time
        for line in process.stdout:
            print(line, end='')
        
        process.wait()
        
        if process.returncode == 0:
            print(f"\nSuccess! Video saved to: {output_file}")
            return True
        else:
            print(f"\nError: FFmpeg exited with code {process.returncode}")
            return False
            
    except FileNotFoundError:
        print("Error: FFmpeg not found. Please install FFmpeg first.")
        print("Visit: https://ffmpeg.org/download.html")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Merge PNG sequences with transparency into video',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Basic usage with auto-detection
  %(prog)s -i /path/to/images/ -o output.mov

  # Specify pattern and framerate
  %(prog)s -i /path/to/frame_%%04d.png -o output.mov -fps 30

  # Use VP9 codec for WebM output
  %(prog)s -i /path/to/images/ -o output.webm -c vp9

  # Process specific frame range
  %(prog)s -i /path/to/frame_%%04d.png -o output.mov -s 100 -n 50
        '''
    )
    
    parser.add_argument('-i', '--input', required=True,
                      help='Input directory or pattern (e.g., "frame_%%04d.png")')
    parser.add_argument('-o', '--output', required=True,
                      help='Output video file')
    parser.add_argument('-fps', '--framerate', type=int, default=24,
                      help='Frame rate (default: 24)')
    parser.add_argument('-c', '--codec', default='prores_ks',
                      choices=['prores_ks', 'qtrle', 'vp9', 'vp8', 'png', 'gif'],
                      help='Video codec (default: prores_ks for ProRes 4444)')
    parser.add_argument('-s', '--start', type=int,
                      help='Start frame number')
    parser.add_argument('-n', '--frames', type=int,
                      help='Number of frames to process')
    parser.add_argument('--preset', choices=['good', 'best', 'realtime'],
                      help='Encoding preset for VP9 codec')
    
    args = parser.parse_args()
    
    # Determine input pattern
    input_path = args.input
    start_number = args.start
    
    if os.path.isdir(input_path):
        # Auto-detect pattern
        print(f"Auto-detecting PNG sequence in: {input_path}")
        pattern, start, end, padding = find_sequence_pattern(input_path)
        
        if pattern is None:
            print("Error: No PNG files found in directory")
            return 1
        
        print(f"Detected pattern: {pattern}")
        print(f"Frame range: {start} to {end} (padding: {padding})")
        
        # Validate sequence
        input_pattern = os.path.join(input_path, pattern)
        missing = validate_sequence(input_path, pattern, start, end)
        
        if missing:
            print(f"\nWarning: {len(missing)} files missing in sequence:")
            for m in missing[:5]:
                print(f"  - {m}")
            if len(missing) > 5:
                print(f"  ... and {len(missing) - 5} more")
            
            response = input("\nContinue anyway? (y/n): ")
            if response.lower() != 'y':
                return 1
        
        if start_number is None:
            start_number = start
            
    else:
        # Use provided pattern
        input_pattern = input_path
        
        # Validate pattern format
        if '%' not in input_pattern:
            print("Error: Input pattern must contain % format specifier (e.g., frame_%04d.png)")
            print("       or be a directory path for auto-detection")
            return 1
    
    # Determine output format based on file extension
    output_ext = Path(args.output).suffix.lower()
    
    # Validate codec choice for output format
    if output_ext == '.webm' and args.codec not in ['vp9', 'vp8']:
        print(f"Warning: {args.codec} codec may not be compatible with WebM format")
        print("Recommended codecs for WebM: vp9, vp8")
    elif output_ext in ['.mov', '.mp4'] and args.codec in ['vp9', 'vp8']:
        print(f"Warning: {args.codec} codec may not be compatible with {output_ext} format")
        print("Recommended codecs for MOV/MP4: prores_ks, qtrle")
    
    # Merge the sequence
    success = merge_png_sequence(
        input_pattern=input_pattern,
        output_file=args.output,
        fps=args.framerate,
        codec=args.codec,
        start_number=start_number,
        vframes=args.frames,
        preset=args.preset
    )
    
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
