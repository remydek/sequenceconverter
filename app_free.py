"""
Free Transparent Video Creator
Minimal Flask server for serving the client-side application
All video processing happens in the browser with FFmpeg.wasm
"""

from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    """Add security headers for SharedArrayBuffer support (required for FFmpeg.wasm)"""
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    # Allow CORS for FFmpeg.wasm resources
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/')
def index():
    """Serve the main application"""
    return render_template('index_free.html')

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': 'free-client-side'
    })

@app.route('/api/log-event', methods=['POST'])
def log_event():
    """
    Simple event logging endpoint for analytics
    Tracks usage without storing any files
    """
    try:
        data = request.get_json()
        event_type = data.get('event')
        
        # Log to console (in production, you might want to use a proper logging service)
        print(f"Event: {event_type} - {data}")
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/config')
def get_config():
    """
    Return configuration for the frontend
    """
    return jsonify({
        'environment': os.getenv('FLASK_ENV', 'development'),
        'features': {
            'client_side_processing': True,
            'auth_required_for_download': True,
            'max_file_size_mb': 500,
            'supported_formats': ['webm', 'mp4', 'gif', 'mov']
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"🎬 Starting Free Transparent Video Creator on port {port}")
    print("✨ Features:")
    print("  - 100% client-side video processing")
    print("  - No file uploads to server")
    print("  - Simple auth for downloads only")
    print("  - Completely free, no limits!")
    print(f"  - Access at: http://localhost:{port}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)