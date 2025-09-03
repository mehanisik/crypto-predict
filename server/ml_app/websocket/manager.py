from flask_socketio import SocketIO, emit
from typing import Dict, Any, Optional, Union
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

    def broadcast_stage_update(self, stage: Union[ModelStage, str], data: Dict[str, Any], *, room: Optional[str] = None):
        # Use socketio's background task for non-blocking emits
        def async_emit():
            if data.get('progress') == 100:
                time.sleep(1)

            event_name = stage.value if isinstance(stage, ModelStage) else stage
            update = {
                'stage': event_name,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            self.logger.debug(event_name=event_name, room=room, data=update)
            if room:
                self.socketio.emit(event_name, update, room=room)
            else:
                self.socketio.emit(event_name, update)

        # Execute in background thread
        self.socketio.start_background_task(async_emit)

    def emit_training_update(self, session_id: str, data: Dict[str, Any]):
        try:
            payload = {
                'session_id': session_id,
                'timestamp': datetime.now().isoformat(),
                **data
            }
            self.logger.debug(session_id=session_id, data_type=data.get('type'))
            self.socketio.emit('training_update', payload, room=f'training_{session_id}')
        except Exception as e:
            self.logger.error("emit_training_update_failed", session_id=session_id, error=str(e))

    def emit_stage(self, session_id: str, stage: str, data: Dict[str, Any]):
        # Convenience to emit namespaced stage updates to a training room
        self.broadcast_stage_update(stage, {**data, 'session_id': session_id}, room=f'training_{session_id}')


