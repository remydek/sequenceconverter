"""
Premium Transparent Video Creator Backend
Minimal Flask server for serving the premium frontend and handling usage analytics
All video processing is done client-side with FFmpeg.wasm
"""

from flask import Flask, render_template, jsonify, request
import os
from datetime import datetime

app = Flask(__name__)

@app.after_request
def add_security_headers(response):
    """Add security headers for SharedArrayBuffer support"""
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    return response

@app.route('/')
def premium_index():
    """Serve the premium frontend"""
    return render_template('index_premium.html')

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': 'premium'
    })

@app.route('/api/analytics', methods=['POST'])
def log_analytics():
    """
    Optional analytics endpoint for additional tracking
    (Most tracking is done directly with Supabase from the frontend)
    """
    try:
        data = request.get_json()
        
        # Log to console for now (in production, you might want to log to a file or database)
        print(f"Analytics: {data}")
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/config')
def get_config():
    """
    Return configuration for the frontend
    In production, you might want to serve different configs based on environment
    """
    return jsonify({
        'environment': os.getenv('FLASK_ENV', 'development'),
        'features': {
            'client_side_processing': True,
            'supabase_auth': True,
            'usage_tracking': True
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))  # Different port from the original app
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting Premium Transparent Video Creator on port {port}")
    print("Features:")
    print("- Client-side video processing with FFmpeg.wasm")
    print("- Supabase authentication and usage tracking")
    print("- Freemium model with usage limits")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
