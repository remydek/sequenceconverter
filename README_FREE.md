# 🎬 Free Transparent Video Creator

**100% Free • Client-Side Processing • Privacy First**

Convert PNG sequences to transparent videos directly in your browser. No uploads, no server processing, no limits!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25-green.svg)
![Cost](https://img.shields.io/badge/cost-FREE-brightgreen.svg)

## ✨ Features

- **🔒 100% Private**: All processing happens in your browser. Your files never leave your device.
- **⚡ Fast Processing**: Powered by FFmpeg.wasm for efficient client-side video encoding
- **✨ Transparency Support**: Preserve alpha channels for perfect overlays and animations
- **♾️ Completely Free**: No limits, no subscriptions, no hidden costs
- **📧 Optional Sign-up**: Only required if you want to save your email for updates

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd transparent-video-app

# Install Python dependencies (minimal - just Flask)
pip install -r requirements.txt
```

### 2. Configure Supabase (Optional)

If you want to capture user emails for downloads:

1. Create a free account at [supabase.com](https://supabase.com)
2. Follow the setup guide in `SUPABASE_SETUP_FREE.md`
3. Update credentials in `static/app_free.js`:

```javascript
this.supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
this.supabaseKey = 'YOUR_ANON_KEY';
```

> **Note**: The app works without Supabase - users can skip authentication when downloading.

### 3. Run the App

```bash
python app_free.py

# Open http://localhost:5000 in your browser
```

## 🎯 How It Works

1. **Drop PNG Files**: Drag and drop your PNG sequence into the browser
2. **Configure Settings**: Choose frame rate, format, resolution, and quality
3. **Process Locally**: Video is created entirely in your browser using FFmpeg.wasm
4. **Download**: Optionally sign up to download (or skip and download anyway)

## 🎨 Supported Formats

| Format | Use Case | Transparency |
|--------|----------|--------------|
| **WebM** | Web videos, modern browsers | ✅ Yes |
| **MP4** | Universal compatibility | ❌ No |
| **GIF** | Animations, social media | ✅ Yes |
| **MOV** | Professional editing (ProRes) | ✅ Yes |

## 🛠️ Technical Stack

- **Frontend**: Pure HTML, CSS, JavaScript (no framework dependencies)
- **Processing**: FFmpeg.wasm (runs entirely in browser)
- **Backend**: Minimal Flask server (just serves static files)
- **Auth**: Supabase (optional, for email capture only)

## 📁 Project Structure

```
transparent-video-app/
├── app_free.py              # Minimal Flask server
├── templates/
│   └── index_free.html      # Main HTML template
├── static/
│   ├── app_free.js          # Client-side logic
│   ├── style_free.css       # Styling
│   └── ffmpeg/              # FFmpeg.wasm files
├── SUPABASE_SETUP_FREE.md   # Supabase configuration guide
└── requirements.txt         # Python dependencies (just Flask)
```

## 🌐 Deployment

### Deploy to Vercel/Netlify (Recommended for static hosting)

Since processing is client-side, you can deploy as a static site:

1. Build the static files
2. Deploy to Vercel, Netlify, or GitHub Pages
3. No server required!

### Deploy with Docker

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app_free.py"]
```

### Deploy to Cloud (Minimal server)

The server only serves static files, so you can use the smallest instance:

- **Heroku**: Free tier works perfectly
- **Railway**: $5/month starter plan
- **Render**: Free tier available
- **Google Cloud Run**: Pay per request

## 🔧 Configuration

### Environment Variables (Optional)

```env
FLASK_ENV=production
PORT=5000
SUPABASE_URL=your_supabase_url  # Optional
SUPABASE_ANON_KEY=your_anon_key # Optional
```

## 🤝 Why Free?

This tool runs entirely in your browser using WebAssembly. Since there's no server processing:

- **No hosting costs**: Static files are cheap/free to host
- **No bandwidth costs**: Files never leave the user's device
- **No storage costs**: Everything is processed client-side
- **No scaling issues**: Each user's browser does the work

The only optional cost is Supabase (free tier is generous) for capturing emails.

## 📊 Analytics (Optional)

If you set up Supabase, you can track:
- Number of videos created
- Popular output formats
- User sign-ups
- Download counts

All without storing any actual video data!

## 🔒 Privacy Promise

- ✅ Files never leave your browser
- ✅ No server uploads or processing
- ✅ No tracking without consent
- ✅ Open source and auditable
- ✅ Works offline after first load

## 🐛 Troubleshooting

### "FFmpeg failed to load"
- Ensure your browser supports WebAssembly
- Try Chrome, Firefox, or Edge (latest versions)
- Check browser console for errors

### "Processing is slow"
- Large files take time to process client-side
- Try reducing resolution or frame count
- Close other browser tabs to free memory

### "Browser crashed"
- Processing very large videos requires significant RAM
- Try processing in smaller batches
- Reduce resolution in settings

## 📝 License

MIT License - Use freely for any purpose!

## 🙏 Credits

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - Client-side video processing
- [Supabase](https://supabase.com) - Optional authentication
- You! For choosing privacy-first tools

## 💡 Future Ideas

Since everything is free and client-side, we could add:
- Batch processing multiple sequences
- Video editing features (trim, crop, effects)
- Real-time preview during processing
- PWA support for offline use
- More export formats

---

**Made with ❤️ for creators who value privacy and freedom**

No servers. No uploads. No limits. Just free video creation!