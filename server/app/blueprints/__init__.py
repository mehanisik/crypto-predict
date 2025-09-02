from flask import Blueprint

api_bp = Blueprint('api', __name__)
websocket_bp = Blueprint('websocket', __name__)

from . import api_routes, websocket_routes
