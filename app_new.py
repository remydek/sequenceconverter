#!/usr/bin/env python3
"""
Consolidated Transparent Video Creator
Modern Flask backend with feature flags, proper error handling, and security
"""

from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename
import os
import tempfile
import shutil
import subprocess
import uuid
import logging
import time
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from config import Config

# Configure logging
logging.basicConfig(
    level=logging.INFO if Config.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
cors = CORS(app, origins=Config.CORS_ORIGINS)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[f"{Config.RATE_LIMIT_PER_MINUTE} per minute"],
    storage_uri="memory://"
)

# Global state
processing_jobs: Dict[str, Dict[str, Any]] = {}
app_stats = {
    'start_time': datetime.utcnow(),
    'total_jobs': 0,
    'active_jobs': 0,
    'completed_jobs': 0,
    'failed_jobs': 0
}

ALLOWED_EXTENSIONS = {'png'}

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_files(files: List) -> tuple[bool, str, int]:
    """Validate uploaded files"""
    if not files or files[0].filename == '':
        return False, 'No files selected', 400

    valid_files = [f for f in files if f and allowed_file(f.filename)]
    if not valid_files:
        return False, 'No valid PNG files uploaded', 400

    if len(valid_files) > Config.MAX_FRAME_COUNT:
        return False, f'Too many files. Maximum {Config.MAX_FRAME_COUNT} frames allowed', 400

    # Check total file size (approximate)
    total_size = sum(len(f.read()) for f in valid_files if f)
    for f in valid_files:
        f.seek(0)  # Reset file pointers

    if total_size > Config.MAX_CONTENT_LENGTH:
        return False, f'Total file size exceeds {Config.MAX_FILE_SIZE_MB}MB limit', 400

    return True, 'Valid', 200

@app.before_request
def log_request():
    """Log incoming requests in debug mode"""
    if Config.DEBUG:
        logger.debug(f"Request: {request.method} {request.path}")

@app.after_request
def add_security_headers(response):
    """Add security headers for SharedArrayBuffer support and general security"""
    # Required for FFmpeg.wasm
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'

    # General security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'

    if not Config.DEBUG:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    return response

@app.errorhandler(413)
def too_large(error):
    """Handle file too large error"""
    return jsonify({
        'error': f'File too large. Maximum size is {Config.MAX_FILE_SIZE_MB}MB'
    }), 413

@app.errorhandler(429)
def ratelimit_handler(error):
    """Handle rate limit exceeded"""
    return jsonify({
        'error': 'Rate limit exceeded. Please try again later.',
        'retry_after': error.retry_after
    }), 429

@app.errorhandler(500)
def internal_error(error):
    """Handle internal server errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({
        'error': 'Internal server error. Please try again later.'
    }), 500

@app.route('/')
def index():
    """Serve the main application"""
    template = 'index_new.html'

    # Choose template based on features (keeping for future expansion)
    if Config.ENABLE_PREMIUM_FEATURES:
        template = 'index_new.html'  # Using new template for all modes

    return render_template(template)

@app.route('/robots.txt')
def robots_txt():
    """Serve robots.txt for search engines and AI crawlers"""
    try:
        return send_file('static/robots.txt', mimetype='text/plain')
    except FileNotFoundError:
        logger.error("robots.txt not found")
        return "User-agent: *\nAllow: /", 200, {'Content-Type': 'text/plain'}

@app.route('/sitemap.xml')
def sitemap_xml():
    """Serve sitemap.xml for search engines"""
    try:
        return send_file('static/sitemap.xml', mimetype='application/xml')
    except FileNotFoundError:
        logger.error("sitemap.xml not found")
        return '''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://sequenceconverter.com/</loc>
        <lastmod>2024-09-15</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>''', 200, {'Content-Type': 'application/xml'}

@app.route('/favicon.ico')
def favicon():
    """Serve favicon.ico"""
    try:
        return send_file('static/favicon.png', mimetype='image/png')
    except FileNotFoundError:
        logger.error("favicon.png not found")
        return '', 404

@app.route('/health')
def health_check():
    """Comprehensive health check endpoint"""
    config_validation = Config.validate_config()
    uptime = datetime.utcnow() - app_stats['start_time']

    return jsonify({
        'status': 'healthy' if config_validation['valid'] else 'degraded',
        'timestamp': datetime.utcnow().isoformat(),
        'uptime_seconds': int(uptime.total_seconds()),
        'version': '2.0.0-typescript',
        'config_valid': config_validation['valid'],
        'config_warnings': config_validation.get('warnings', []),
        'stats': {
            'active_jobs': app_stats['active_jobs'],
            'total_jobs': app_stats['total_jobs'],
            'success_rate': (
                app_stats['completed_jobs'] / max(app_stats['total_jobs'], 1) * 100
                if app_stats['total_jobs'] > 0 else 100
            )
        }
    })

@app.route('/api/config')
def get_config():
    """Return client-safe configuration"""
    return jsonify(Config.get_client_config())

@app.route('/api/stats')
def get_stats():
    """Get application statistics"""
    uptime = datetime.utcnow() - app_stats['start_time']
    return jsonify({
        'uptime_seconds': int(uptime.total_seconds()),
        'total_jobs': app_stats['total_jobs'],
        'active_jobs': app_stats['active_jobs'],
        'completed_jobs': app_stats['completed_jobs'],
        'failed_jobs': app_stats['failed_jobs'],
        'success_rate': (
            app_stats['completed_jobs'] / max(app_stats['total_jobs'], 1) * 100
            if app_stats['total_jobs'] > 0 else 100
        )
    })

@app.route('/api/log-event', methods=['POST'])
@limiter.limit("30 per minute")
def log_event():
    """
    Simple event logging endpoint for analytics
    Rate limited to prevent spam
    """
    try:
        data = request.get_json()
        if not data or 'event' not in data:
            return jsonify({'error': 'Invalid request data'}), 400

        event_type = data.get('event')

        # Log significant events
        if event_type in ['processing_started', 'processing_completed', 'processing_failed']:
            logger.info(f"Event: {event_type} - {data}")
        elif Config.DEBUG:
            logger.debug(f"Event: {event_type} - {data}")

        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error logging event: {e}")
        return jsonify({'error': 'Failed to log event'}), 500

# Server-side processing routes (legacy support)
@app.route('/upload', methods=['POST'])
@limiter.limit("5 per minute")
def upload_files():
    """Upload files for server-side processing (if enabled)"""
    if not Config.ENABLE_FILE_UPLOADS:
        return jsonify({
            'error': 'File uploads are disabled. Use client-side processing instead.'
        }), 403

    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files')
    is_valid, message, status_code = validate_files(files)

    if not is_valid:
        return jsonify({'error': message}), status_code

    # Create unique job ID
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(Config.UPLOAD_FOLDER, f'job_{job_id}')

    try:
        os.makedirs(job_dir, exist_ok=True)

        # Save uploaded files
        saved_files = []
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(job_dir, filename)
                file.save(filepath)
                saved_files.append(filename)

        # Sort files to ensure correct order
        saved_files.sort()

        # Store job info
        processing_jobs[job_id] = {
            'status': 'uploaded',
            'files': saved_files,
            'dir': job_dir,
            'progress': 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        app_stats['total_jobs'] += 1
        app_stats['active_jobs'] += 1

        logger.info(f"Job {job_id} created with {len(saved_files)} files")

        return jsonify({
            'job_id': job_id,
            'file_count': len(saved_files),
            'files': saved_files[:5] + (['...'] if len(saved_files) > 5 else [])
        })

    except Exception as e:
        logger.error(f"Error uploading files: {e}")
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir)
        return jsonify({'error': 'Failed to upload files'}), 500

@app.route('/process/<job_id>', methods=['POST'])
@limiter.limit("3 per minute")
def process_video(job_id: str):
    """Process uploaded video (server-side processing)"""
    if not Config.ENABLE_FILE_UPLOADS:
        return jsonify({
            'error': 'Server-side processing is disabled'
        }), 403

    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = processing_jobs[job_id]
    if job['status'] != 'uploaded':
        return jsonify({'error': 'Job already processing or completed'}), 400

    try:
        # Get parameters with validation
        data = request.get_json() or {}
        fps = max(1, min(60, data.get('fps', 24)))  # Clamp FPS
        codec = data.get('codec', 'vp9')
        quality = data.get('quality', 'good')

        # Validate codec
        if codec not in ['vp9', 'vp8', 'gif', 'prores', 'qtrle']:
            return jsonify({'error': 'Invalid codec'}), 400

        # Start processing in background
        thread = threading.Thread(
            target=process_job,
            args=(job_id, fps, codec, quality),
            name=f"ProcessJob-{job_id[:8]}"
        )
        thread.daemon = True
        thread.start()

        logger.info(f"Started processing job {job_id} with codec {codec}")

        return jsonify({'status': 'processing'})

    except Exception as e:
        logger.error(f"Error starting processing for job {job_id}: {e}")
        return jsonify({'error': 'Failed to start processing'}), 500

def process_job(job_id: str, fps: int, codec: str, quality: str):
    """Process video job with comprehensive error handling"""
    job = processing_jobs[job_id]
    job['status'] = 'processing'
    job['updated_at'] = datetime.utcnow()

    start_time = time.time()

    try:
        logger.info(f"Processing job {job_id}: {len(job['files'])} frames at {fps} FPS")

        # Rename files to sequential pattern
        files = sorted(job['files'])
        for i, filename in enumerate(files):
            old_path = os.path.join(job['dir'], filename)
            new_path = os.path.join(job['dir'], f'frame_{i:04d}.png')
            if os.path.exists(old_path):
                os.rename(old_path, new_path)

        # Determine output format
        output_ext = {
            'vp9': 'webm',
            'vp8': 'webm',
            'gif': 'gif',
            'prores': 'mov',
            'qtrle': 'mov'
        }.get(codec, 'webm')

        output_file = os.path.join(job['dir'], f'output.{output_ext}')

        # Build FFmpeg command with timeout protection
        success = False
        if codec == 'gif':
            success = _process_gif(job, fps, output_file, files)
        else:
            success = _process_video(job, fps, codec, quality, output_file, files)

        processing_time = time.time() - start_time

        if success and os.path.exists(output_file):
            job['status'] = 'completed'
            job['output'] = output_file
            job['output_size'] = os.path.getsize(output_file)
            job['processing_time'] = processing_time
            job['updated_at'] = datetime.utcnow()

            app_stats['completed_jobs'] += 1
            logger.info(f"Job {job_id} completed in {processing_time:.1f}s")
        else:
            job['status'] = 'failed'
            job['error'] = 'FFmpeg processing failed'
            app_stats['failed_jobs'] += 1
            logger.error(f"Job {job_id} failed after {processing_time:.1f}s")

    except Exception as e:
        job['status'] = 'failed'
        job['error'] = str(e)
        job['updated_at'] = datetime.utcnow()
        app_stats['failed_jobs'] += 1
        logger.error(f"Job {job_id} failed with exception: {e}")

    finally:
        app_stats['active_jobs'] -= 1

def _process_gif(job: Dict, fps: int, output_file: str, files: List[str]) -> bool:
    """Process GIF with palette optimization"""
    try:
        job_dir = job['dir']
        palette_file = os.path.join(job_dir, 'palette.png')

        # First pass: generate palette
        palette_cmd = [
            'ffmpeg', '-y', '-v', 'error',
            '-framerate', str(fps),
            '-i', os.path.join(job_dir, 'frame_%04d.png'),
            '-vf', f'fps={fps},scale=640:-1:flags=lanczos,palettegen=stats_mode=diff:transparency_color=ffffff',
            palette_file
        ]

        result = subprocess.run(
            palette_cmd,
            timeout=Config.MAX_PROCESSING_TIME_SECONDS // 2,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"Palette generation failed: {result.stderr}")
            return False

        # Second pass: create GIF
        gif_cmd = [
            'ffmpeg', '-y', '-v', 'error',
            '-framerate', str(fps),
            '-i', os.path.join(job_dir, 'frame_%04d.png'),
            '-i', palette_file,
            '-lavfi', f'fps={fps},scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
            '-gifflags', '+transdiff',
            output_file
        ]

        result = subprocess.run(
            gif_cmd,
            timeout=Config.MAX_PROCESSING_TIME_SECONDS,
            capture_output=True,
            text=True
        )

        return result.returncode == 0

    except subprocess.TimeoutExpired:
        logger.error(f"GIF processing timeout for job {job.get('id', 'unknown')}")
        return False
    except Exception as e:
        logger.error(f"GIF processing error: {e}")
        return False

def _process_video(job: Dict, fps: int, codec: str, quality: str, output_file: str, files: List[str]) -> bool:
    """Process video with codec-specific options"""
    try:
        job_dir = job['dir']

        cmd = [
            'ffmpeg', '-y', '-v', 'error',
            '-framerate', str(fps),
            '-i', os.path.join(job_dir, 'frame_%04d.png')
        ]

        # Add codec-specific options
        if codec == 'vp9':
            cmd.extend(['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p'])
            if quality == 'best':
                cmd.extend(['-deadline', 'best', '-cpu-used', '0'])
            elif quality == 'good':
                cmd.extend(['-deadline', 'good', '-cpu-used', '1'])
            else:
                cmd.extend(['-deadline', 'realtime', '-cpu-used', '5'])
        elif codec == 'vp8':
            cmd.extend(['-c:v', 'libvpx', '-pix_fmt', 'yuva420p'])
        elif codec == 'prores':
            cmd.extend(['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le'])
        elif codec == 'qtrle':
            cmd.extend(['-c:v', 'qtrle'])

        cmd.append(output_file)

        # Run with timeout and progress monitoring
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )

        # Simple timeout handling
        try:
            stdout, _ = process.communicate(timeout=Config.MAX_PROCESSING_TIME_SECONDS)
            return process.returncode == 0
        except subprocess.TimeoutExpired:
            process.kill()
            logger.error(f"Video processing timeout for job {job.get('id', 'unknown')}")
            return False

    except Exception as e:
        logger.error(f"Video processing error: {e}")
        return False

@app.route('/status/<job_id>')
def get_status(job_id: str):
    """Get job status with detailed information"""
    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = processing_jobs[job_id]
    response = {
        'status': job['status'],
        'progress': job.get('progress', 0),
        'created_at': job['created_at'].isoformat(),
        'updated_at': job['updated_at'].isoformat()
    }

    if job['status'] == 'completed':
        response.update({
            'output_size': job.get('output_size', 0),
            'processing_time': job.get('processing_time', 0)
        })
    elif job['status'] == 'failed':
        response['error'] = job.get('error', 'Unknown error')

    return jsonify(response)

@app.route('/download/<job_id>')
def download_video(job_id: str):
    """Download processed video with security checks"""
    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = processing_jobs[job_id]
    if job['status'] != 'completed' or 'output' not in job:
        return jsonify({'error': 'Video not ready'}), 400

    output_file = job['output']
    if not os.path.exists(output_file):
        return jsonify({'error': 'Output file not found'}), 404

    filename = f'transparent_video_{job_id[:8]}.{Path(output_file).suffix}'

    # Schedule cleanup
    threading.Timer(60, cleanup_job, args=[job_id]).start()

    logger.info(f"Serving download for job {job_id}")

    return send_file(
        output_file,
        as_attachment=True,
        download_name=filename,
        mimetype='application/octet-stream'
    )

def cleanup_job(job_id: str):
    """Clean up job files and data"""
    if job_id in processing_jobs:
        job = processing_jobs[job_id]
        if 'dir' in job and os.path.exists(job['dir']):
            try:
                shutil.rmtree(job['dir'])
                logger.debug(f"Cleaned up job {job_id}")
            except Exception as e:
                logger.error(f"Failed to cleanup job {job_id}: {e}")
        del processing_jobs[job_id]

def cleanup_old_jobs():
    """Clean up old jobs periodically"""
    while True:
        try:
            time.sleep(3600)  # Check every hour
            current_time = datetime.utcnow()
            jobs_to_remove = []

            for job_id, job in processing_jobs.items():
                # Remove jobs older than 2 hours
                if current_time - job.get('created_at', current_time) > timedelta(hours=2):
                    jobs_to_remove.append(job_id)

            for job_id in jobs_to_remove:
                cleanup_job(job_id)
                logger.info(f"Auto-cleaned old job {job_id}")

        except Exception as e:
            logger.error(f"Error in cleanup thread: {e}")

# Start cleanup thread
if Config.ENABLE_FILE_UPLOADS:
    cleanup_thread = threading.Thread(target=cleanup_old_jobs, daemon=True, name="JobCleanup")
    cleanup_thread.start()

def main():
    """Main application entry point with validation"""
    # Validate configuration
    config_validation = Config.validate_config()

    if not config_validation['valid']:
        logger.error("Configuration validation failed:")
        for error in config_validation['errors']:
            logger.error(f"  - {error}")
        return 1

    if config_validation['warnings']:
        logger.warning("Configuration warnings:")
        for warning in config_validation['warnings']:
            logger.warning(f"  - {warning}")

    # Create required directories
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/dist', exist_ok=True)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # Display startup information
    logger.info(f"🎬 Starting Transparent Video Creator v2.0.0")
    logger.info(f"   Environment: {Config.FLASK_ENV}")
    logger.info(f"   Port: {Config.PORT}")
    logger.info(f"   Debug: {Config.DEBUG}")
    logger.info(f"   Features: Premium={Config.ENABLE_PREMIUM_FEATURES}, Uploads={Config.ENABLE_FILE_UPLOADS}")
    logger.info(f"   Access: http://localhost:{Config.PORT}")

    # Start the application
    try:
        app.run(
            host='0.0.0.0',
            port=Config.PORT,
            debug=Config.DEBUG,
            use_reloader=False  # Disable reloader in production
        )
        return 0
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        return 1

if __name__ == '__main__':
    import sys
    sys.exit(main())