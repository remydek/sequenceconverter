# Transparent Video Merger Tool

A powerful tool to merge PNG sequences with transparency (alpha channel) into transparent videos. Available as both a command-line tool and web applications with freemium SaaS capabilities.

## 🚀 Premium Version (NEW!)

**Client-side processing with authentication and usage tracking**

### Features
- **🔐 User Authentication**: Google OAuth and email sign-in via Supabase
- **💻 Client-side Processing**: Uses FFmpeg.wasm - no server uploads needed
- **📊 Usage Tracking**: Monitor your monthly video creation limits
- **🎯 Freemium Model**: 
  - **Free Tier**: 5 videos/month, max 50 frames, watermark on GIFs
  - **Pro Tier**: Unlimited videos, unlimited frames, no watermark, high quality
- **🌐 Modern UI**: Beautiful, responsive interface with progress tracking
- **🔒 Privacy-First**: All processing happens in your browser

### Quick Start (Premium Version)
```bash
# Start the premium app
python app_premium.py

# Open http://localhost:5001
```

**Setup Required**: Follow the [Supabase Setup Guide](SUPABASE_SETUP.md) to configure authentication and database.

---

## 🌐 Standard Web Application

### Features
- **Drag & Drop Interface**: Simply drop your PNG files into the browser
- **No Installation Required**: Works directly in your web browser
- **Real-time Progress**: See encoding progress in real-time
- **Multiple Format Support**: Export to WebM (VP9/VP8), MOV (ProRes/Animation), or optimized GIF
- **Automatic Sorting**: Files are automatically sorted by name
- **GIF Optimization**: Creates optimized GIFs with transparency using advanced palette generation

### Quick Start (Standard Web Version)

#### Option 1: Using Docker (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd transparent-video-app

# Run with Docker Compose
docker-compose up

# Open http://localhost:5000 in your browser
```

#### Option 2: Run Locally
```bash
# Install Python dependencies
pip install -r requirements.txt

# Make sure FFmpeg is installed
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg

# Run the web server
python app.py

# Open http://localhost:5000 in your browser
```

### Web Interface Usage
1. **Drop Files**: Drag and drop your PNG sequence into the drop zone
2. **Configure Settings**: 
   - Choose frame rate (24, 25, 30, or 60 fps)
   - Select output format (GIF for animations, WebM for web, MOV for editing)
   - Pick quality level
3. **Create Video**: Click "Create Video" and wait for processing
4. **Download**: Click "Download Video" when complete

### Deployment to Production

#### Using Docker
```bash
# Build the image
docker build -t transparent-video-app .

# Run in production
docker run -d -p 80:5000 --restart unless-stopped transparent-video-app
```

#### Environment Variables
- `FLASK_ENV`: Set to `production` for production deployment
- `MAX_CONTENT_LENGTH`: Maximum upload size (default: 500MB)

---

## 💻 Command-Line Tool

## Features

- **Preserves Alpha Channel**: Maintains transparency throughout the encoding process
- **Auto-Detection**: Automatically detects PNG sequence patterns in directories
- **Multiple Codecs**: Support for various alpha-preserving codecs:
  - ProRes 4444 (default, best quality)
  - QuickTime Animation (qtrle)
  - VP9/VP8 (for WebM format)
  - PNG video (lossless)
  - GIF (optimized for web animations)
- **Flexible Input**: Works with numbered sequences like `frame_0001.png`, `image001.png`, etc.
- **Progress Display**: Real-time FFmpeg output for encoding progress

## Prerequisites

- Python 3.6+
- FFmpeg (with alpha channel support)

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [FFmpeg official site](https://ffmpeg.org/download.html)

## Installation

Clone this repository:
```bash
git clone <repository-url>
cd transparent-video-app
```

Make the script executable:
```bash
chmod +x merge_transparent_video.py
```

## Usage

### Basic Usage

Auto-detect PNG sequence in a directory:
```bash
python merge_transparent_video.py -i /path/to/images/ -o output.mov
```

### Create Optimized GIF

Generate an optimized GIF with transparency:
```bash
python merge_transparent_video.py -i /path/to/images/ -o output.gif -c gif
```

### Specify Pattern

Use a specific naming pattern:
```bash
python merge_transparent_video.py -i /path/to/frame_%04d.png -o output.mov
```

### Different Frame Rate

Set custom frame rate (default is 24):
```bash
python merge_transparent_video.py -i /path/to/images/ -o output.mov -fps 30
```

### WebM Output with VP9

Create a WebM file with transparency:
```bash
python merge_transparent_video.py -i /path/to/images/ -o output.webm -c vp9
```

### Process Specific Frame Range

Start from frame 100 and process 50 frames:
```bash
python merge_transparent_video.py -i /path/to/frame_%04d.png -o output.mov -s 100 -n 50
```

## Codec Options

| Codec | Format | Quality | File Size | Use Case |
|-------|--------|---------|-----------|----------|
| `gif` | GIF | Good | Small | Web animations, social media |
| `prores_ks` | MOV | Excellent | Large | Professional editing |
| `qtrle` | MOV | Good | Medium | Quick previews |
| `vp9` | WebM | Good | Small | Web delivery |
| `vp8` | WebM | Fair | Small | Web compatibility |
| `png` | MOV/AVI | Lossless | Very Large | Archival |

## Examples

### Example 1: Animated GIF
```bash
# Create an optimized GIF from PNG sequence
python merge_transparent_video.py -i animation/ -o animation.gif -c gif -fps 15
```

### Example 2: VFX Composite
```bash
# Merge explosion VFX sequence at 30fps
python merge_transparent_video.py -i vfx/explosion_%04d.png -o explosion_comp.mov -fps 30
```

### Example 3: Web-Ready Video
```bash
# Create transparent WebM for web use
python merge_transparent_video.py -i animation/ -o animation.webm -c vp9 --preset good
```

## Direct FFmpeg Commands

If you prefer using FFmpeg directly without the Python wrapper:

### Optimized GIF with Transparency
```bash
# Generate palette
ffmpeg -i frame_%04d.png -vf "fps=24,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff:transparency_color=ffffff" palette.png

# Create GIF using palette
ffmpeg -i frame_%04d.png -i palette.png -lavfi "fps=24,scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -gifflags +transdiff output.gif
```

### ProRes 4444 with Alpha
```bash
ffmpeg -framerate 24 -i frame_%04d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le output.mov
```

### VP9 WebM with Alpha
```bash
ffmpeg -framerate 24 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p output.webm
```

### QuickTime Animation
```bash
ffmpeg -framerate 24 -i frame_%04d.png -c:v qtrle output.mov
```

## Troubleshooting

### "FFmpeg not found"
Make sure FFmpeg is installed and in your system PATH.

### Missing frames warning
The tool will detect missing frames in your sequence and ask for confirmation before proceeding.

### Codec compatibility
- Use ProRes or QuickTime Animation for MOV files
- Use VP9 or VP8 for WebM files
- Check FFmpeg documentation for codec availability on your system

## License

MIT License - feel free to use and modify as needed.
