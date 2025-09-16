#!/usr/bin/env python3
"""
Vercel serverless function entry point for Flask app
"""
import sys
import os

# Add the parent directory to Python path so we can import our Flask app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app_new import app

# This is the WSGI application that Vercel will use
application = app

# For local testing
if __name__ == "__main__":
    app.run()