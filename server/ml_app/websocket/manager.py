from flask_socketio import SocketIO, emit
from typing import Dict, Any
import structlog
from flask import request
from datetime import datetime
from enum import Enum
import time


class ModelStage(Enum):
    TRAINING = "training"
    EVALUATING = "evaluating"
    VISUALIZING = "visualizing"
    

class WebSocketManager:
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.logger = structlog.get_logger(__name__)

    def setup_handlers(self):
        @self.socketio.on('connect')
        def handle_connect():
            self.logger.info("client_connected", client_id=request.sid)
            emit('connected', {'status': 'connected'})

        @self.socketio.on('disconnect')
        def handle_disconnect():
            self.logger.info("client_disconnected", client_id=request.sid)

    def broadcast_stage_update(self, stage: ModelStage, data: Dict[str, Any]):
        # Use socketio's background task for non-blocking emits
        def async_emit():
            if data.get('progress') == 100:
                time.sleep(1)
                
            update = {
                'stage': stage,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            self.logger.debug(f"Broadcasting to channel: {stage}", data=update)
            self.socketio.emit(stage, update)
        
        # Execute in background thread
        self.socketio.start_background_task(async_emit)


