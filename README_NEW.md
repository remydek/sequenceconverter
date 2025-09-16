# Transparent Video Creator v2.0

A modern, mobile-responsive web application for creating transparent videos from PNG sequences using client-side processing.

## ✨ Features

- **100% Client-Side Processing**: No file uploads, complete privacy
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices
- **Multiple Output Formats**: WebM, MP4, GIF, MOV support
- **TypeScript**: Full type safety and modern development experience
- **Real-time Progress**: Live processing feedback
- **Authentication**: Optional Supabase integration
- **PWA Support**: Install as a native app
- **Comprehensive Testing**: Unit, integration, and E2E tests

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- FFmpeg (for server-side processing, optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/transparent-video-app.git
   cd transparent-video-app
   ```

2. **Install dependencies**
   ```bash
   # Install Node.js dependencies
   npm install

   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run serve
   ```

6. **Open your browser**
   Navigate to `http://localhost:5555`

## 🛠️ Development

### Development Server

Start the development environment:

```bash
# Terminal 1: Build TypeScript in watch mode
npm run dev

# Terminal 2: Start Flask server
npm run serve
```

For development with hot reloading:

```bash
npm run dev:server
```

### Available Scripts

- `npm run build` - Build for production
- `npm run dev` - Build in development mode with watch
- `npm run dev:server` - Development server with hot reload
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Fix linting issues
- `npm run lint:check` - Check for linting issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types
- `npm run validate` - Run all checks (lint, format, type-check, test)

### Project Structure

```
├── src/                     # TypeScript source code
│   ├── types/              # Type definitions
│   ├── services/           # Service classes (FFmpeg, Auth)
│   ├── utils/              # Utility functions
│   └── app.ts              # Main application entry point
├── static/
│   ├── css/                # Stylesheets
│   ├── ffmpeg/             # FFmpeg.wasm files
│   └── dist/               # Built frontend assets
├── templates/              # Flask templates
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── app_new.py              # Main Flask application
├── config.py               # Configuration management
└── requirements.txt        # Python dependencies
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Flask Configuration
FLASK_ENV=development
FLASK_SECRET_KEY=your-secret-key-here
PORT=5555

# Supabase Configuration (optional)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Feature Flags
ENABLE_PREMIUM_FEATURES=false
ENABLE_USAGE_TRACKING=true
ENABLE_FILE_UPLOADS=true

# Processing Limits
MAX_FILE_SIZE_MB=500
MAX_PROCESSING_TIME_SECONDS=300
MAX_FRAME_COUNT=1000
```

### Device Optimization

The app automatically detects device capabilities and adjusts settings:

- **Desktop**: Full features, higher limits
- **Tablet**: Medium settings, good performance
- **Mobile**: Conservative limits, optimized for battery

## 📱 Mobile Responsiveness

### Features

- **Touch-optimized**: 44px minimum touch targets
- **Responsive design**: Works on all screen sizes
- **Orientation handling**: Adapts to landscape/portrait
- **PWA support**: Installable on mobile devices
- **Battery optimization**: Reduced processing on mobile

### CSS Framework

Modern CSS with:
- CSS Grid and Flexbox layouts
- CSS Custom Properties (variables)
- Mobile-first responsive design
- Dark mode support
- High DPI display support
- Accessibility features

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run CI tests
npm run test:ci
```

### Test Types

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows

### Test Structure

```
tests/
├── setup.ts                # Test configuration
├── unit/
│   ├── device.test.ts      # Device detection tests
│   └── ffmpeg.test.ts      # FFmpeg service tests
└── integration/
    └── app.test.ts         # App integration tests
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy automatically** on push to main branch

Configuration is handled by `vercel.json`.

### Docker

Build and run with Docker:

```bash
# Build the image
docker build -t transparent-video-app .

# Run the container
docker run -p 8080:8080 \
  -e FLASK_ENV=production \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_ANON_KEY=your-key \
  transparent-video-app
```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   export FLASK_ENV=production
   export PORT=8080
   ```

3. **Start the server**
   ```bash
   python app_new.py
   ```

## 🔐 Authentication

Optional Supabase authentication provides:

- Google OAuth integration
- User profiles and preferences
- Usage tracking and limits
- Premium feature access

### Setup Supabase

1. **Create a Supabase project**
2. **Enable Google OAuth** in Authentication settings
3. **Create user profiles table** (optional):
   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users NOT NULL,
     name TEXT,
     avatar_url TEXT,
     subscription_tier TEXT DEFAULT 'free',
     usage_count INTEGER DEFAULT 0,
     usage_limit INTEGER DEFAULT 10,
     created_at TIMESTAMP DEFAULT NOW(),
     PRIMARY KEY (id)
   );
   ```

4. **Set environment variables**:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 🎛️ Advanced Configuration

### Processing Options

- **Frame Rate**: 1-60 FPS (device-optimized defaults)
- **Codecs**: VP9, VP8, H.264, GIF, ProRes
- **Quality**: Fast, Good, Best
- **Output Formats**: WebM, MP4, GIF, MOV
- **Scaling**: Custom width/height with aspect ratio control

### Performance Optimization

- **Memory Management**: Automatic cleanup and garbage collection
- **Progressive Loading**: Lazy load FFmpeg.wasm
- **Chunk Processing**: Handle large files efficiently
- **Worker Support**: Offload processing (desktop only)

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg.wasm not loading**
   - Check CORS headers
   - Verify SharedArrayBuffer support
   - Use HTTPS in production

2. **Files not processing**
   - Verify PNG format
   - Check file size limits
   - Ensure sufficient memory

3. **Mobile performance issues**
   - Reduce frame count
   - Lower quality settings
   - Use GIF format for compatibility

### Debug Mode

Enable debug logging:

```env
FLASK_ENV=development
```

Check browser console for detailed error messages.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** and add tests
4. **Run validation**: `npm run validate`
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - Client-side video processing
- [Supabase](https://supabase.com/) - Authentication and database
- [Vercel](https://vercel.com/) - Hosting platform
- Modern CSS Grid and Flexbox layouts
- TypeScript community for excellent tooling

## 📊 Performance

### Benchmarks

| Device Type | Max Frames | Recommended FPS | Avg Processing Time |
|-------------|-----------|-----------------|-------------------|
| Desktop     | 1000      | 30 FPS          | ~2s per second    |
| Tablet      | 500       | 24 FPS          | ~3s per second    |
| Mobile      | 100       | 15 FPS          | ~5s per second    |

### Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited (no SharedArrayBuffer)
- **Edge**: Full support

## 🔮 Roadmap

- [ ] WebAssembly optimization
- [ ] Batch processing
- [ ] Cloud storage integration
- [ ] Advanced video effects
- [ ] API endpoints
- [ ] Plugin system

---

Made with ❤️ using TypeScript, Python, and modern web technologies.