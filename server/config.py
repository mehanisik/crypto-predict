"""Configuration settings for the crypto prediction API."""

import os
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class BaseConfig:
    """Base configuration class."""
    
    # Flask settings
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'development')
    DEBUG: bool = os.getenv('FLASK_ENV') == 'development'
    
    # Database settings - Require Postgres/Neon URL via env var
    DATABASE_URL: str = os.getenv('DATABASE_URL')
    SQLALCHEMY_DATABASE_URI: str = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = None
    
    # CORS settings
    CORS_ORIGINS: List[str] = None
    
    # JWT settings
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES: int = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))  # 1 hour
    JWT_REFRESH_TOKEN_EXPIRES: int = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))  # 30 days
    
    # Redis settings
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Celery settings (modern keys only)
    BROKER_URL: str = os.getenv('BROKER_URL', 'redis://localhost:6379/1')
    RESULT_BACKEND: str = os.getenv('RESULT_BACKEND', 'redis://localhost:6379/2')
    
    # Rate limiting
    RATELIMIT_DEFAULT: str = os.getenv('RATELIMIT_DEFAULT', '100 per minute')
    RATELIMIT_STORAGE_URL: str = os.getenv('RATELIMIT_STORAGE_URL', 'redis://localhost:6379/3')
    
    # Caching configuration
    CACHE_TYPE: str = os.getenv('CACHE_TYPE', 'simple')  # Use simple cache for development
    CACHE_REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT: int = int(os.getenv('CACHE_DEFAULT_TIMEOUT', '300'))  # 5 minutes
    CACHE_KEY_PREFIX: str = 'crypto_predict_'
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT: str = os.getenv('LOG_FORMAT', 'json')
    
    # Security
    SESSION_COOKIE_SECURE: bool = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Lax'
    
    # API settings
    API_VERSION: str = 'v1'
    API_TITLE: str = 'Crypto Prediction API'
    API_DESCRIPTION: str = 'AI-powered cryptocurrency prediction API'
    
    # Training settings
    MAX_TRAINING_SESSIONS: int = int(os.getenv('MAX_TRAINING_SESSIONS', '10'))
    MAX_EPOCHS: int = int(os.getenv('MAX_EPOCHS', '1000'))
    TRAINING_TIMEOUT: int = int(os.getenv('TRAINING_TIMEOUT', '3600'))  # 1 hour
    
    # Prediction settings
    MAX_PREDICTION_DAYS: int = int(os.getenv('MAX_PREDICTION_DAYS', '30'))
    PREDICTION_CACHE_TTL: int = int(os.getenv('PREDICTION_CACHE_TTL', '300'))  # 5 minutes
    
    def __post_init__(self):
        """Post-initialization validation."""
        if self.CORS_ORIGINS is None:
            self.CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000']
        
        # Ensure a database URL is provided
        if not self.SQLALCHEMY_DATABASE_URI:
            raise ValueError("DATABASE_URL environment variable is required and must point to your Postgres/Neon database")

        if self.SQLALCHEMY_ENGINE_OPTIONS is None:
            # Default to PostgreSQL-friendly settings
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_size': int(os.getenv('DB_POOL_SIZE', '10')),
                'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
                'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
                'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '20'))
            }


@dataclass
class DevelopmentConfig(BaseConfig):
    """Development configuration."""
    
    DEBUG: bool = True
    LOG_LEVEL: str = 'INFO'
    
    # Development-specific settings
    SQLALCHEMY_ECHO: bool = False
    PRESERVE_CONTEXT_ON_EXCEPTION: bool = False
    
    # Use simple cache for development
    CACHE_TYPE: str = 'simple'


@dataclass
class TestingConfig(BaseConfig):
    """Testing configuration."""
    
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = 'INFO'
    
    # Use test database (Postgres) if provided, otherwise fall back to DATABASE_URL
    DATABASE_URL: str = os.getenv('TEST_DATABASE_URL', os.getenv('DATABASE_URL'))
    SQLALCHEMY_DATABASE_URI: str = os.getenv('TEST_DATABASE_URL', os.getenv('DATABASE_URL'))
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED: bool = False


@dataclass
class ProductionConfig(BaseConfig):
    """Production configuration."""
    
    DEBUG: bool = False
    LOG_LEVEL: str = 'WARNING'
    
    # Production security
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = 'Strict'
    
    # Production database settings
    SQLALCHEMY_ENGINE_OPTIONS: dict = None
    
    def __post_init__(self):
        """Production-specific post-initialization."""
        super().__post_init__()
        
        # Override with production database settings
        if self.SQLALCHEMY_ENGINE_OPTIONS is None:
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
                'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
                'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
                'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '30')),
                'pool_pre_ping': True,
                'echo': False
            }


# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(config_name: str = None) -> BaseConfig:
    """Get configuration based on environment."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    config_class = config.get(config_name, config['default'])
    return config_class()
