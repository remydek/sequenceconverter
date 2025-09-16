"""
Configuration management for Transparent Video App
Handles environment variables with validation and defaults
"""

import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class with environment variable handling"""

    # Flask Configuration
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'production')
    SECRET_KEY: str = os.getenv('FLASK_SECRET_KEY', 'dev-key-change-in-production')
    PORT: int = int(os.getenv('PORT', '5555'))
    DEBUG: bool = FLASK_ENV == 'development'

    # Supabase Configuration
    SUPABASE_URL: Optional[str] = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY: Optional[str] = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY: Optional[str] = os.getenv('SUPABASE_SERVICE_KEY')

    # Google OAuth Configuration (optional)
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv('GOOGLE_CLIENT_SECRET')

    # Feature Flags
    ENABLE_PREMIUM_FEATURES: bool = os.getenv('ENABLE_PREMIUM_FEATURES', 'false').lower() == 'true'
    ENABLE_USAGE_TRACKING: bool = os.getenv('ENABLE_USAGE_TRACKING', 'true').lower() == 'true'
    ENABLE_FILE_UPLOADS: bool = os.getenv('ENABLE_FILE_UPLOADS', 'true').lower() == 'true'

    # Processing Limits
    MAX_FILE_SIZE_MB: int = int(os.getenv('MAX_FILE_SIZE_MB', '500'))
    MAX_PROCESSING_TIME_SECONDS: int = int(os.getenv('MAX_PROCESSING_TIME_SECONDS', '300'))
    MAX_FRAME_COUNT: int = int(os.getenv('MAX_FRAME_COUNT', '1000'))

    # Security
    CORS_ORIGINS: list = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5555').split(',')
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv('RATE_LIMIT_PER_MINUTE', '10'))

    # File Upload Configuration
    MAX_CONTENT_LENGTH: int = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
    UPLOAD_FOLDER: str = os.getenv('UPLOAD_FOLDER', '/tmp')

    @classmethod
    def validate_config(cls) -> Dict[str, Any]:
        """Validate configuration and return status"""
        errors = []
        warnings = []

        # Check required environment variables for production
        if cls.FLASK_ENV == 'production':
            if not cls.SUPABASE_URL:
                errors.append("SUPABASE_URL is required in production")
            if not cls.SUPABASE_ANON_KEY:
                errors.append("SUPABASE_ANON_KEY is required in production")
            if cls.SECRET_KEY == 'dev-key-change-in-production':
                errors.append("FLASK_SECRET_KEY must be set in production")

        # Check optional but recommended settings
        if not cls.SUPABASE_URL and cls.ENABLE_USAGE_TRACKING:
            warnings.append("Usage tracking enabled but no Supabase configuration found")

        if not cls.GOOGLE_CLIENT_ID and cls.ENABLE_PREMIUM_FEATURES:
            warnings.append("Premium features enabled but no Google OAuth configuration found")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'config': {
                'flask_env': cls.FLASK_ENV,
                'debug': cls.DEBUG,
                'port': cls.PORT,
                'features': {
                    'premium': cls.ENABLE_PREMIUM_FEATURES,
                    'usage_tracking': cls.ENABLE_USAGE_TRACKING,
                    'file_uploads': cls.ENABLE_FILE_UPLOADS,
                },
                'limits': {
                    'max_file_size_mb': cls.MAX_FILE_SIZE_MB,
                    'max_processing_time': cls.MAX_PROCESSING_TIME_SECONDS,
                    'max_frames': cls.MAX_FRAME_COUNT,
                    'rate_limit': cls.RATE_LIMIT_PER_MINUTE,
                }
            }
        }

    @classmethod
    def get_client_config(cls) -> Dict[str, Any]:
        """Get configuration safe to send to client"""
        return {
            'environment': cls.FLASK_ENV,
            'supabase': {
                'url': cls.SUPABASE_URL,
                'anonKey': cls.SUPABASE_ANON_KEY,
            } if cls.SUPABASE_URL and cls.SUPABASE_ANON_KEY else None,
            'features': {
                'clientSideProcessing': True,
                'premiumFeatures': cls.ENABLE_PREMIUM_FEATURES,
                'usageTracking': cls.ENABLE_USAGE_TRACKING,
                'fileUploads': cls.ENABLE_FILE_UPLOADS,
                'authRequiredForDownload': bool(cls.SUPABASE_URL),
            },
            'limits': {
                'maxFileSizeMB': cls.MAX_FILE_SIZE_MB,
                'maxProcessingTimeSeconds': cls.MAX_PROCESSING_TIME_SECONDS,
                'maxFrameCount': cls.MAX_FRAME_COUNT,
                'supportedFormats': ['webm', 'mp4', 'gif', 'mov']
            },
            'oauth': {
                'google': {
                    'clientId': cls.GOOGLE_CLIENT_ID
                } if cls.GOOGLE_CLIENT_ID else None
            }
        }