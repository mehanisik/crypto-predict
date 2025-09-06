"""Flask application factory for crypto prediction API."""

from flask import Flask, request, send_from_directory
import threading
import time
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_caching import Cache
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger
from prometheus_flask_exporter import PrometheusMetrics

from config import get_config
from app.utils.logger import setup_logging, get_logger
from app.utils.error_handlers import register_error_handlers
from app.middleware import setup_middleware

db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO(
    async_mode='eventlet',
    cors_allowed_origins="*",
    cors_credentials=False
)
cache = Cache()
jwt = JWTManager()

limiter = None

logger = get_logger(__name__)


def create_app(config_name=None):
    """Application factory function."""

    config = get_config(config_name)

    app = Flask(__name__)
    app.config.from_object(config)

    setup_logging()

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(
        app,
        cors_allowed_origins=config.CORS_ORIGINS,
        message_queue=config.REDIS_URL,
        async_mode='eventlet',
        ping_timeout=60,
        ping_interval=25,
        max_http_buffer_size=1e8,  # 100MB
        logger=True,
        engineio_logger=True
    )

    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/apispec_1.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/"
    }

    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "Crypto Prediction API",
            "description": "A Flask API for cryptocurrency price prediction using machine learning models",
            "version": "1.0.0",
            "contact": {
                "name": "API Support",
                "email": "support@example.com"
            }
        },
        "host": "localhost:5000",
        "basePath": "/api/v1",
        "schemes": ["http", "https"],
        "consumes": ["application/json"],
        "produces": ["application/json"]
    }

    swagger = Swagger(app, config=swagger_config, template=swagger_template)

    app.socketio = socketio

    register_websocket_handlers(socketio)

    # Register static file serving for plots
    @app.route('/static/plots/<filename>')
    def serve_plot(filename):
        """Serve plot files from the static/plots directory"""
        try:
            return send_from_directory('/app/static/plots', filename)
        except FileNotFoundError:
            return {'error': 'Plot not found'}, 404
        except Exception as e:
            logger.error(f"Error serving plot {filename}: {e}")
            return {'error': 'Internal server error'}, 500

    # Start background cleanup task for plot files
    def cleanup_plots_background():
        """Background task to clean up old plot files"""
        while True:
            try:
                from ml_app.visualization.visualizer import plot_manager
                plot_manager.cleanup_old_plots()
                time.sleep(3600)  # Run every hour
            except Exception as e:
                logger.error(f"Plot cleanup error: {e}")
                time.sleep(3600)

    cleanup_thread = threading.Thread(target=cleanup_plots_background, daemon=True)
    cleanup_thread.start()

    try:
        cache.init_app(app)
        logger.info("cache_configured_with_redis")
    except Exception as e:
        # Fallback to simple cache if Redis is not available
        app.config['CACHE_TYPE'] = 'simple'
        cache.init_app(app)
        logger.warning(f"cache_fallback_to_simple: {e}")

    jwt.init_app(app)

    global limiter
    try:
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=["200 per day", "50 per hour"],
            storage_uri=config.RATELIMIT_STORAGE_URL,
            storage_options={"socket_connect_timeout": 30, "socket_timeout": 30}
        )
        logger.info("rate_limiter_configured_with_redis")
    except Exception as e:
        # Fallback to in-memory storage if Redis is not available
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            default_limits=["200 per day", "50 per hour"]
        )
        logger.warning(f"rate_limiter_fallback_to_memory: {e}")

    # Exempt Engine.IO (Socket.IO) transport requests from rate limiting
    @limiter.request_filter
    def _exempt_socketio_transport():
        try:
            return request.path.startswith('/socket.io')
        except Exception:
            return False

    # Add custom rate limit for health checks (more restrictive)
    limiter.limit("10 per minute", key_func=get_remote_address, scope="health")

    # Exempt Prometheus metrics from rate limiting
    @limiter.request_filter
    def _exempt_metrics():
        try:
            return request.path.startswith('/metrics')
        except Exception:
            return False

    # Setup CORS
    CORS(app, origins=config.CORS_ORIGINS)

    # Setup middleware
    setup_middleware(app)

    # Register error handlers
    register_error_handlers(app)

    # Register blueprints
    from app.blueprints import api_bp
    app.register_blueprint(api_bp, url_prefix=f'/api/{config.API_VERSION}')

    # Setup Prometheus metrics exporter at /metrics
    try:
        PrometheusMetrics(app, defaults_prefix='crypto_predict')
        logger.info("prometheus_metrics_enabled")
    except Exception as e:
        logger.warning(f"prometheus_metrics_setup_failed: {e}")

    # Register CLI commands
    from app.cli import register_commands
    register_commands(app)

    return app


def register_websocket_handlers(socketio_instance):
    """Register WebSocket event handlers."""
    from app.blueprints.websocket_routes import (
        handle_connect, handle_disconnect, handle_join_training,
        handle_leave_training, handle_join_prediction, handle_leave_prediction
    )

    @socketio_instance.on('connect')
    def on_connect():
        handle_connect()

    @socketio_instance.on('disconnect')
    def on_disconnect(reason=None):
        handle_disconnect()

    @socketio_instance.on('join_training')
    def on_join_training(data):
        handle_join_training(data)

    @socketio_instance.on('leave_training')
    def on_leave_training(data):
        handle_leave_training(data)

    @socketio_instance.on('join_prediction')
    def on_join_prediction(data):
        handle_join_prediction(data)

    @socketio_instance.on('leave_prediction')
    def on_leave_prediction(data):
        handle_leave_prediction(data)

    logger.info("websocket_handlers_registered")


def create_celery_app(app):
    """Create Celery application for background tasks."""
    from celery import Celery

    celery = Celery(app.import_name)

    # Use modern Celery keys and filter out deprecated settings
    celery_config = {}
    for k, v in app.config.items():
        # Exclude Celery keys we are going to set explicitly and legacy/deprecated keys
        if k.isupper() and k not in [
            'CELERY_BROKER_URL',
            'CELERY_RESULT_BACKEND',
            'BROKER_URL',
            'RESULT_BACKEND',
        ]:
            celery_config[k] = v

    celery.conf.update(
        # Prefer modern keys if present, fall back to legacy for backwards-compat
        broker_url=app.config.get('CELERY_BROKER_URL') or app.config.get('BROKER_URL'),
        result_backend=app.config.get('CELERY_RESULT_BACKEND') or app.config.get('RESULT_BACKEND'),
        **celery_config
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
