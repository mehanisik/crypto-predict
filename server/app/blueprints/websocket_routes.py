from flask import current_app
from flask_socketio import emit, join_room, leave_room
from app.utils.logger import get_logger

logger = get_logger(__name__)


def handle_connect():
    """Handle client connection."""
    logger.info("websocket_connected")
    emit('connected', {'status': 'connected'})


def handle_disconnect():
    """Handle client disconnection."""
    logger.info("websocket_disconnected")


def handle_join_training(data):
    """Handle joining a training room."""
    session_id = data.get('session_id')
    if not session_id:
        emit('error_update', {'message': 'Session ID required'})
        return
    join_room(f'training_{session_id}')
    logger.info("joined_training_room", session_id=session_id)
    emit('joined_training', {'session_id': session_id, 'status': 'joined'})
    # Immediate snapshot to the joining client (no room) so they see something instantly
    emit('training_update', {
        'session_id': session_id,
        'type': 'status',
        'message': 'Joined training room',
        'progress': 0
    })


def handle_leave_training(data):
    """Handle leaving a training room."""
    session_id = data.get('session_id')
    if not session_id:
        emit('error_update', {'message': 'Session ID required'})
        return
    leave_room(f'training_{session_id}')
    logger.info("left_training_room", session_id=session_id)
    emit('left_training', {'session_id': session_id, 'status': 'left'})


def handle_join_prediction(data):
    """Handle joining a prediction room."""
    request_id = data.get('request_id')
    if not request_id:
        emit('error_update', {'message': 'Request ID required'})
        return
    join_room(f'prediction_{request_id}')
    logger.info("joined_prediction_room", request_id=request_id)
    emit('joined_prediction', {'request_id': request_id, 'status': 'joined'})


def handle_leave_prediction(data):
    """Handle leaving a prediction room."""
    request_id = data.get('request_id')
    if not request_id:
        emit('error_update', {'message': 'Request ID required'})
        return
    leave_room(f'prediction_{request_id}')
    logger.info("left_prediction_room", request_id=request_id)
    emit('left_prediction', {'request_id': request_id, 'status': 'left'})


def emit_training_update(session_id: str, update_data: dict) -> None:
    """Emit training update to a specific room."""
    try:
        current_app.socketio.emit(
            'training_update',
            {'session_id': session_id, **update_data},
            room=f'training_{session_id}'
        )
        logger.info("training_update_emitted", session_id=session_id, update_type=update_data.get('type'))
    except Exception as e:
        logger.error("failed_to_emit_training_update", session_id=session_id, error=str(e))


def emit_prediction_update(request_id: str, update_data: dict) -> None:
    """Emit prediction update to a specific room."""
    try:
        current_app.socketio.emit(
            'prediction_update',
            update_data,
            room=f'prediction_{request_id}'
        )
        logger.info("prediction_update_emitted", request_id=request_id, update_type=update_data.get('type'))
    except Exception as e:
        logger.error("failed_to_emit_prediction_update", request_id=request_id, error=str(e))


def emit_error_update(room_type: str, room_id: str, error_data: dict) -> None:
    """Emit error update to a specific room."""
    try:
        room_name = f'{room_type}_{room_id}'
        current_app.socketio.emit(
            'error_update',
            error_data,
            room=room_name
        )
        logger.error("error_update_emitted", room=room_name, error=error_data.get('message'))
    except Exception as e:
        logger.error("failed_to_emit_error_update", room=room_name, error=str(e))
