from flask import Flask, render_template
from flask_socketio import SocketIO
from flask_cors import CORS


socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    socketio.init_app(app, cors_allowed_origins="*")
    CORS(app)

    from app.routes.stock import stock_blueprint
    app.register_blueprint(stock_blueprint, url_prefix="/api")

  
    return app
