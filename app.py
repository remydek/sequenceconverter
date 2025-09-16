#!/usr/bin/env python3
"""
Web application for Transparent Video Merger
Flask backend with drag-and-drop interface
"""

from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import tempfile
import shutil
import subprocess
import uuid
from pathlib import Path
import threading
import time

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max upload
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

# Store processing jobs
processing_jobs = {}

ALLOWED_EXTENSIONS = {'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    # Create unique job ID
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], f'job_{job_id}')
    os.makedirs(job_dir, exist_ok=True)
    
    # Save uploaded files
    saved_files = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(job_dir, filename)
            file.save(filepath)
            saved_files.append(filename)
    
    if not saved_files:
        shutil.rmtree(job_dir)
        return jsonify({'error': 'No valid PNG files uploaded'}), 400
    
    # Sort files to ensure correct order
    saved_files.sort()
    
    # Store job info
    processing_jobs[job_id] = {
        'status': 'uploaded',
        'files': saved_files,
        'dir': job_dir,
        'progress': 0
    }
    
    return jsonify({
        'job_id': job_id,
        'file_count': len(saved_files),
        'files': saved_files[:5] + (['...'] if len(saved_files) > 5 else [])
    })

@app.route('/process/<job_id>', methods=['POST'])
def process_video(job_id):
    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = processing_jobs[job_id]
    if job['status'] != 'uploaded':
        return jsonify({'error': 'Job already processing or completed'}), 400
    
    # Get parameters
    data = request.json
    fps = data.get('fps', 24)
    codec = data.get('codec', 'vp9')  # Default to VP9 for web
    quality = data.get('quality', 'good')
    
    # Start processing in background
    thread = threading.Thread(target=process_job, args=(job_id, fps, codec, quality))
    thread.start()
    
    return jsonify({'status': 'processing'})

def process_job(job_id, fps, codec, quality):
    job = processing_jobs[job_id]
    job['status'] = 'processing'
    
    try:
        # Rename files to sequential pattern
        files = sorted(job['files'])
        for i, filename in enumerate(files):
            old_path = os.path.join(job['dir'], filename)
            new_path = os.path.join(job['dir'], f'frame_{i:04d}.png')
            os.rename(old_path, new_path)
        
        # Determine output format
        if codec in ['vp9', 'vp8']:
            output_ext = 'webm'
        elif codec == 'gif':
            output_ext = 'gif'
        else:
            output_ext = 'mov'
        
        output_file = os.path.join(job['dir'], f'output.{output_ext}')
        
        # Build FFmpeg command
        cmd = [
            'ffmpeg', '-y',
            '-framerate', str(fps),
            '-i', os.path.join(job['dir'], 'frame_%04d.png')
        ]
        
        # Codec-specific options
        if codec == 'gif':
            # Generate optimized GIF with transparency
            palette_file = os.path.join(job['dir'], 'palette.png')
            
            # First pass: generate palette
            palette_cmd = [
                'ffmpeg', '-y',
                '-framerate', str(fps),
                '-i', os.path.join(job['dir'], 'frame_%04d.png'),
                '-vf', f'fps={fps},scale=640:-1:flags=lanczos,palettegen=stats_mode=diff:transparency_color=ffffff',
                palette_file
            ]
            
            subprocess.run(palette_cmd, check=True, capture_output=True)
            
            # Second pass: create GIF using palette
            cmd = [
                'ffmpeg', '-y',
                '-framerate', str(fps),
                '-i', os.path.join(job['dir'], 'frame_%04d.png'),
                '-i', palette_file,
                '-lavfi', f'fps={fps},scale=640:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
                '-gifflags', '+transdiff',
                output_file
            ]
        elif codec == 'vp9':
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
        
        if codec != 'gif':
            cmd.append(output_file)
        
        # Run FFmpeg
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # Monitor progress
        for line in process.stdout:
            if 'frame=' in line:
                try:
                    frame_match = line.split('frame=')[1].split()[0]
                    current_frame = int(frame_match)
                    progress = min(100, int((current_frame / len(files)) * 100))
                    job['progress'] = progress
                except:
                    pass
        
        process.wait()
        
        if process.returncode == 0:
            job['status'] = 'completed'
            job['output'] = output_file
            job['output_size'] = os.path.getsize(output_file)
        else:
            job['status'] = 'failed'
            job['error'] = 'FFmpeg processing failed'
            
    except Exception as e:
        job['status'] = 'failed'
        job['error'] = str(e)

@app.route('/status/<job_id>')
def get_status(job_id):
    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = processing_jobs[job_id]
    response = {
        'status': job['status'],
        'progress': job.get('progress', 0)
    }
    
    if job['status'] == 'completed':
        response['output_size'] = job.get('output_size', 0)
    elif job['status'] == 'failed':
        response['error'] = job.get('error', 'Unknown error')
    
    return jsonify(response)

@app.route('/download/<job_id>')
def download_video(job_id):
    if job_id not in processing_jobs:
        return jsonify({'error': 'Job not found'}), 404
    
    job = processing_jobs[job_id]
    if job['status'] != 'completed' or 'output' not in job:
        return jsonify({'error': 'Video not ready'}), 400
    
    output_file = job['output']
    filename = f'transparent_video_{job_id[:8]}.{Path(output_file).suffix}'
    
    # Clean up job after download (delayed)
    threading.Timer(60, cleanup_job, args=[job_id]).start()
    
    return send_file(output_file, as_attachment=True, download_name=filename)

def cleanup_job(job_id):
    if job_id in processing_jobs:
        job = processing_jobs[job_id]
        if 'dir' in job and os.path.exists(job['dir']):
            shutil.rmtree(job['dir'])
        del processing_jobs[job_id]

# Cleanup old jobs periodically
def cleanup_old_jobs():
    while True:
        time.sleep(3600)  # Check every hour
        current_time = time.time()
        jobs_to_remove = []
        
        for job_id, job in processing_jobs.items():
            job_dir = job.get('dir')
            if job_dir and os.path.exists(job_dir):
                # Remove jobs older than 2 hours
                if current_time - os.path.getctime(job_dir) > 7200:
                    jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            cleanup_job(job_id)

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_old_jobs, daemon=True)
cleanup_thread.start()

if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    # Run in production mode by default, debug mode can be set via environment
    debug_mode = os.environ.get('FLASK_ENV', 'production') == 'development'
    port = int(os.environ.get('PORT', 5555))
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
