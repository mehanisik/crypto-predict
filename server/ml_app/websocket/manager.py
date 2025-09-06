from flask_socketio import SocketIO, emit
from typing import Dict, Any, Optional, Union, List, Literal
import structlog
from flask import request
from datetime import datetime
from enum import Enum
import time


class ModelStage(Enum):
    DATA_FETCHING = "data_fetching"
    DATA_FETCHED = "data_fetched"
    PREPROCESSING = "preprocessing"
    FEATURE_ENGINEERING = "feature_engineering"
    MODEL_BUILDING = "model_building"
    MODEL_INFO = "model_info"
    TRAINING_UPDATE = "training_update"
    TRAINING_PROGRESS = "training_progress"
    EVALUATING_UPDATE = "evaluating_update"
    VISUALIZING_UPDATE = "visualizing_update"
    TRAINING_COMPLETED = "training_completed"


class ProgressTracker:
    """Centralized progress tracking with smooth transitions"""

    STAGE_PROGRESS = {
        ModelStage.DATA_FETCHING: 5,
        ModelStage.DATA_FETCHED: 10,
        ModelStage.PREPROCESSING: 15,
        ModelStage.FEATURE_ENGINEERING: 20,
        ModelStage.MODEL_BUILDING: 25,
        ModelStage.MODEL_INFO: 30,
        ModelStage.TRAINING_UPDATE: 35,
        ModelStage.TRAINING_PROGRESS: 40,  # Base training progress
        ModelStage.EVALUATING_UPDATE: 70,
        ModelStage.VISUALIZING_UPDATE: 85,
        ModelStage.TRAINING_COMPLETED: 100
    }

    def __init__(self):
        self.current_stage = ModelStage.DATA_FETCHING
        self.current_progress = 0
        self.training_epoch_progress = 0  # 0-100 for training epochs
        self.stage_sub_progress = 0  # 0-100 for sub-stages within a stage
        self.last_update_time = time.time()

    def get_progress(self, stage: ModelStage, epoch_progress: float = 0, sub_progress: float = 0) -> int:
        """Calculate total progress based on stage, epoch progress, and sub-progress"""
        base_progress = self.STAGE_PROGRESS.get(stage, 0)

        if stage == ModelStage.TRAINING_PROGRESS:
            # Training stage: base 40% + epoch progress (up to 30%)
            epoch_contribution = (epoch_progress / 100) * 30
            return min(int(base_progress + epoch_contribution), 70)
        elif stage == ModelStage.EVALUATING_UPDATE:
            # Evaluation stage: base 70% + sub-progress (up to 15%)
            sub_contribution = (sub_progress / 100) * 15
            return min(int(base_progress + sub_contribution), 85)
        elif stage == ModelStage.VISUALIZING_UPDATE:
            # Visualization stage: base 85% + sub-progress (up to 15%)
            sub_contribution = (sub_progress / 100) * 15
            return min(int(base_progress + sub_contribution), 100)
        else:
            # Other stages: base progress + sub-progress
            stage_range = self._get_stage_range(stage)
            sub_contribution = (sub_progress / 100) * stage_range
            return min(int(base_progress + sub_contribution), self.STAGE_PROGRESS.get(stage, 0))

    def _get_stage_range(self, stage: ModelStage) -> int:
        """Get the progress range for a stage"""
        stages = list(self.STAGE_PROGRESS.keys())
        try:
            current_index = stages.index(stage)
            if current_index + 1 < len(stages):
                return self.STAGE_PROGRESS[stages[current_index + 1]] - self.STAGE_PROGRESS[stage]
            else:
                return 5  # Default range for last stage
        except ValueError:
            return 5

    def update_stage(self, stage: ModelStage, sub_progress: float = 0):
        """Update current stage with sub-progress"""
        self.current_stage = stage
        self.stage_sub_progress = sub_progress
        self.current_progress = self.get_progress(stage, self.training_epoch_progress, sub_progress)

    def update_training_progress(self, epoch: int, total_epochs: int):
        """Update training epoch progress"""
        self.training_epoch_progress = (epoch / total_epochs) * 100
        self.current_progress = self.get_progress(ModelStage.TRAINING_PROGRESS, self.training_epoch_progress, self.stage_sub_progress)

    def update_sub_progress(self, sub_progress: float):
        """Update sub-progress within current stage"""
        self.stage_sub_progress = sub_progress
        self.current_progress = self.get_progress(self.current_stage, self.training_epoch_progress, sub_progress)


class WebSocketManager:
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.logger = structlog.get_logger(__name__)
        self.progress_trackers = {}  # session_id -> ProgressTracker

    def _build_message_for_stage(self, stage: str, data: Dict[str, Any]) -> str:
        """Return a concise human-readable message for a given stage.

        This normalizes messages across emitters so the client gets consistent phrasing.
        """
        if isinstance(data.get('message'), str) and data['message'].strip():
            return data['message']

        try:
            stage_enum = ModelStage(stage)
        except ValueError:
            stage_enum = None

        if stage_enum == ModelStage.DATA_FETCHING:
            ticker = data.get('ticker')
            start = data.get('start_date')
            end = data.get('end_date')
            if ticker and start and end:
                return f"Fetching {ticker} {start} → {end}"
            return "Fetching data"
        if stage_enum == ModelStage.DATA_FETCHED:
            rows = data.get('rows')
            return f"Data retrieved ({rows} rows)" if rows is not None else "Data retrieved"
        if stage_enum == ModelStage.PREPROCESSING:
            features = data.get('features')
            return f"Preprocessing ({features} features)" if features is not None else "Preprocessing"
        if stage_enum == ModelStage.FEATURE_ENGINEERING:
            feats = data.get('features')
            return f"Feature engineering ({feats} features)" if feats is not None else "Feature engineering"
        if stage_enum == ModelStage.MODEL_BUILDING:
            model_type = data.get('model_type')
            return f"Building {model_type} model" if model_type else "Building model"
        if stage_enum == ModelStage.MODEL_INFO:
            model_type = data.get('model_type')
            return f"{model_type} model ready" if model_type else "Model ready"
        if stage_enum in (ModelStage.TRAINING_UPDATE, ModelStage.TRAINING_PROGRESS):
            epoch = data.get('epoch')
            total = data.get('total_epochs')
            if epoch and total:
                return f"Training epoch {epoch}/{total}"
            return "Training"
        if stage_enum == ModelStage.EVALUATING_UPDATE:
            metric = data.get('current_metric')
            return f"Calculating {str(metric).upper()} metric" if metric else "Calculating metrics"
        if stage_enum == ModelStage.VISUALIZING_UPDATE:
            plot = data.get('current_plot')
            return f"Generating {plot} visualization" if plot else "Generating visualizations"
        if stage_enum == ModelStage.TRAINING_COMPLETED:
            return "Training completed successfully!"

        return stage.replace('_', ' ')

    def _build_payload(self,
                       *,
                       session_id: str,
                       phase: Literal[
                           'data', 'preprocess', 'features', 'build', 'train', 'evaluate', 'visualize', 'complete', 'error'
                       ],
                       event: str,
                       data: Dict[str, Any],
                       progress: Optional[int] = None) -> Dict[str, Any]:
        """Create a unified payload structure used across all training events.

        Shape:
        {
          'session_id': str,
          'phase': str,            # coarse-grained pipeline phase
          'event': str,            # fine-grained event name (stage)
          'timestamp': str,
          'progress': int|None,    # 0-100 when applicable
          'data': { ... }          # event-specific payload
        }
        """
        payload: Dict[str, Any] = {
            'session_id': session_id,
            'phase': phase,
            'event': event,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        if progress is not None:
            payload['progress'] = int(progress)
        return payload

    def emit_unified(self, session_id: str, *, phase: str, event: str, data: Dict[str, Any], progress: Optional[int] = None):
        """Emit a standardized 'training_update' message to the training room."""
        try:
            payload = self._build_payload(session_id=session_id, phase=phase, event=event, data=data, progress=progress)
            self.socketio.emit('training_update', payload, room=f'training_{session_id}')
        except Exception as e:
            self.logger.error("emit_unified_failed", session_id=session_id, event=event, error=str(e))

    def setup_handlers(self):
        @self.socketio.on('connect')
        def handle_connect():
            self.logger.info("client_connected", client_id=request.sid)
            emit('connected', {'status': 'connected'})

        @self.socketio.on('disconnect')
        def handle_disconnect():
            self.logger.info("client_disconnected", client_id=request.sid)

    def get_progress_tracker(self, session_id: str) -> ProgressTracker:
        """Get or create progress tracker for session"""
        if session_id not in self.progress_trackers:
            self.progress_trackers[session_id] = ProgressTracker()
        return self.progress_trackers[session_id]

    def broadcast_stage_update(self, stage: Union[ModelStage, str], data: Dict[str, Any], *, room: Optional[str] = None, progress: Optional[int] = None):
        # Use socketio's background task for non-blocking emits
        def async_emit():
            if (progress or data.get('progress')) == 100:
                time.sleep(1)

            event_name = stage.value if isinstance(stage, ModelStage) else stage

            # Emit both the individual stage event AND the unified training_update for backward compatibility
            update = {
                'stage': event_name,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }

            # Emit individual stage event (legacy support)
            self.logger.debug(f"emitting_individual_stage: {event_name}", room=room)
            if room:
                self.socketio.emit(event_name, update, room=room)
            else:
                self.socketio.emit(event_name, update)

            # Also emit as unified training_update event (new format)
            # Ensure a clean message in unified payload
            message = self._build_message_for_stage(event_name, data)
            if message and 'message' not in data:
                # do not mutate original dict for callers; add ephemeral message in update
                update['data'] = {**data, 'message': message}

            unified_payload = self._build_payload(
                session_id=data.get('session_id', 'unknown'),
                phase=self._get_phase_from_stage(event_name),
                event=event_name,
                data=update['data'],
                progress=progress if progress is not None else data.get('progress')
            )
            self.logger.debug(f"emitting_unified_training_update: {event_name}", room=room)
            if room:
                self.socketio.emit('training_update', unified_payload, room=room)
            else:
                self.socketio.emit('training_update', unified_payload)

        # Execute in background thread
        self.socketio.start_background_task(async_emit)

    def _get_phase_from_stage(self, stage: str) -> str:
        """Map stage name to phase for unified payload"""
        phase_map = {
            'data_fetching': 'data',
            'data_fetched': 'data',
            'preprocessing': 'preprocess',
            'feature_engineering': 'features',
            'model_building': 'build',
            'model_info': 'build',
            'training_update': 'train',
            'training_progress': 'train',
            'metric_sample': 'train',
            'evaluating_update': 'evaluate',
            'visualizing_update': 'visualize',
            'series': 'visualize',
            'training_completed': 'complete',
            'training_complete': 'complete'
        }
        return phase_map.get(stage, 'train')

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

    def emit_metric_sample(self, session_id: str, epoch: int, total_epochs: int, *, accuracy: Optional[float] = None,
                           loss: Optional[float] = None, val_accuracy: Optional[float] = None, val_loss: Optional[float] = None):
        """Emit a single metric sample for an epoch so the client can build charts incrementally."""
        tracker = self.get_progress_tracker(session_id)
        tracker.update_training_progress(epoch, total_epochs)
        data: Dict[str, Any] = {
            'epoch': epoch,
            'total_epochs': total_epochs,
            'metrics': {}
        }
        if accuracy is not None:
            data['metrics']['accuracy'] = round(float(accuracy), 6)
        if loss is not None:
            data['metrics']['loss'] = round(float(loss), 6)
        if val_accuracy is not None:
            data['metrics']['val_accuracy'] = round(float(val_accuracy), 6)
        if val_loss is not None:
            data['metrics']['val_loss'] = round(float(val_loss), 6)

        # Add a concise message
        parts = [f"Epoch {epoch}/{total_epochs}"]
        if accuracy is not None:
            parts.append(f"acc {float(accuracy):.3f}")
        if loss is not None:
            parts.append(f"loss {float(loss):.3f}")
        if val_accuracy is not None:
            parts.append(f"val_acc {float(val_accuracy):.3f}")
        if val_loss is not None:
            parts.append(f"val_loss {float(val_loss):.3f}")
        data['message'] = ' • '.join(parts)

        self.emit_unified(session_id, phase='train', event='metric_sample', data=data, progress=tracker.current_progress)

    def emit_series(self, session_id: str, *, series: Dict[str, List[Union[int, float]]], meta: Optional[Dict[str, Any]] = None):
        """Emit complete time-series arrays (e.g., loss/accuracy per epoch, predictions) for client-side plotting."""
        payload_data: Dict[str, Any] = {'series': series}
        if meta:
            payload_data['meta'] = meta
        # Do not set progress here; it's informational
        self.emit_unified(session_id, phase='visualize', event='series', data=payload_data, progress=None)

    def emit_stage(self, session_id: str, stage: str, data: Dict[str, Any]):
        """Emit stage update with proper progress calculation"""
        tracker = self.get_progress_tracker(session_id)

        # Convert string stage to enum if possible
        try:
            stage_enum = ModelStage(stage)
            # Calculate sub-progress if provided
            sub_progress = data.get('sub_progress', 0)
            tracker.update_stage(stage_enum, sub_progress)
        except ValueError:
            # Handle non-enum stages
            pass

        # Calculate progress
        if stage == 'training_progress' and 'epoch' in data and 'total_epochs' in data:
            tracker.update_training_progress(data['epoch'], data['total_epochs'])
            progress = tracker.current_progress
        else:
            progress = tracker.get_progress(tracker.current_stage)

        # Ensure message is present and descriptive
        if 'message' not in data:
            data['message'] = self._build_message_for_stage(stage, data)

        # Add smooth transition delay between stages
        try:
            time.sleep(0.5)  # Reduced delay for smoother transitions
        except Exception:
            pass

        # Convenience to emit namespaced stage updates to a training room
        self.broadcast_stage_update(stage, {**data, 'session_id': session_id}, room=f'training_{session_id}', progress=progress)

    def emit_training_progress(self, session_id: str, epoch: int, total_epochs: int, accuracy: float = None, loss: float = None):
        """Emit training progress with proper progress calculation"""
        tracker = self.get_progress_tracker(session_id)
        tracker.update_training_progress(epoch, total_epochs)

        data = {
            'type': 'training_progress',
            'message': f'Epoch {epoch}/{total_epochs} completed',
            'epoch': epoch,
            'total_epochs': total_epochs,
            'epoch_progress': tracker.training_epoch_progress
        }

        if accuracy is not None:
            data['accuracy'] = round(accuracy, 4)
        if loss is not None:
            data['loss'] = round(loss, 4)

        # Keep backward-compatible flat event
        self.emit_training_update(session_id, data)
        # Also emit unified metric sample for new client consumers
        self.emit_metric_sample(session_id, epoch, total_epochs, accuracy=accuracy, loss=loss)

    def emit_evaluation_progress(self, session_id: str, current_metric: str, total_metrics: int, metric_progress: float):
        """Emit evaluation progress with sub-progress"""
        tracker = self.get_progress_tracker(session_id)
        sub_progress = (metric_progress / total_metrics) * 100
        tracker.update_sub_progress(sub_progress)

        data = {
            'type': 'evaluating_update',
            'current_metric': current_metric,
            'total_metrics': total_metrics,
            'progress': tracker.current_progress,
            'sub_progress': sub_progress,
            'message': f'Calculating {current_metric.upper()} metric'
        }

        self.emit_training_update(session_id, data)

    def emit_visualization_progress(self, session_id: str, current_plot: str, total_plots: int, plot_progress: float):
        """Emit visualization progress with sub-progress"""
        tracker = self.get_progress_tracker(session_id)
        sub_progress = (plot_progress / total_plots) * 100
        tracker.update_sub_progress(sub_progress)

        data = {
            'type': 'visualizing_update',
            'current_plot': current_plot,
            'total_plots': total_plots,
            'progress': tracker.current_progress,
            'sub_progress': sub_progress,
            'message': f'Generating {current_plot} visualization'
        }

        self.emit_training_update(session_id, data)

    def emit_completion(self, session_id: str, final_data: Dict[str, Any]):
        """Emit training completion with 100% progress"""
        tracker = self.get_progress_tracker(session_id)
        tracker.update_stage(ModelStage.TRAINING_COMPLETED)

        completion_data = {
            'type': 'training_completed',
            'message': 'Training completed successfully!',
            **final_data
        }

        # Legacy event
        self.emit_training_update(session_id, {**completion_data, 'progress': 100})
        # Unified
        self.emit_unified(session_id, phase='complete', event='training_completed', data=completion_data, progress=100)

        # Clean up tracker
        if session_id in self.progress_trackers:
            del self.progress_trackers[session_id]


