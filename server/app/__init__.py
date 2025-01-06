from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import init_extensions
from app.api.routes import api_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    init_extensions(app)
    
    CORS(app)
    
    app.register_blueprint(api_bp, url_prefix="/api")
    
    
    return app
