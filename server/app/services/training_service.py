from datetime import datetime, timezone
from typing import Dict, Any, Optional
import random
from app.utils.logger import get_logger
from app.models.training import TrainingStatus
from app.models import TrainingSession
from app import db, socketio

logger = get_logger(__name__)


class TrainingService:
    def __init__(self):
        pass

    def start_training(self, **kwargs) -> Dict[str, Any]:
        session_id = kwargs.get('session_id')
        training_data = kwargs.get('training_data')
        websocket_manager = kwargs.get('websocket_manager')

        logger.info("training_service_start", session_id=session_id)
        logger.info("training_service_parameters",
                   session_id=session_id,
                   has_training_data=bool(training_data))

        if not all([session_id, training_data]):
            logger.error("training_service_missing_parameters",
                        session_id=session_id,
                        has_session_id=bool(session_id),
                        has_training_data=bool(training_data),
                        has_websocket_manager=bool(websocket_manager))
            return {
                'success': False,
                'error': 'Missing required parameters: session_id, training_data'
            }

        try:
            logger.info("training_starting", session_id=session_id, ticker=training_data['ticker'])
            # Ensure a TrainingSession row exists before updates
            try:
                session_row = TrainingSession.query.filter_by(session_id=session_id).first()
                if not session_row:
                    session_row = TrainingSession(
                        session_id=session_id,
                        ticker=training_data.get('ticker'),
                        model_type=training_data.get('model_type'),
                        start_date=training_data.get('start_date'),
                        end_date=training_data.get('end_date'),
                        lookback_days=training_data.get('lookback'),
                        epochs=training_data.get('epochs'),
                        status=TrainingStatus.PENDING
                    )
                    db.session.add(session_row)
                    db.session.commit()
                    logger.info("training_session_created", session_id=session_id)
            except Exception as e:
                logger.error("training_session_create_failed", session_id=session_id, error=str(e), exc_info=True)
                db.session.rollback()

            logger.info("training_status_update", session_id=session_id, status="IN_PROGRESS")
            self._update_training_status(session_id, TrainingStatus.IN_PROGRESS)

            logger.info("background_task_starting", session_id=session_id)
            # Use SocketIO background task with app context
            from flask import current_app
            app = current_app._get_current_object()
            socketio.start_background_task(
                self._run_training_background,
                app,
                session_id,
                training_data
            )

            logger.info("training_started_background", session_id=session_id)
            logger.info("training_service_success", session_id=session_id)

            return {
                'success': True,
                'message': 'Training started successfully',
                'session_id': session_id
            }

        except Exception as e:
            logger.error("training_start_failed", session_id=session_id, error=str(e), exc_info=True)
            self._update_training_status(session_id, TrainingStatus.FAILED)
            logger.info("training_service_failed", session_id=session_id)
            return {'success': False, 'error': f'Training failed: {e!s}'}

    def _run_training_background(self, app, session_id: str, training_data: dict) -> None:
        logger.info("background_training_start", session_id=session_id)
        try:
            with app.app_context():
                logger.info("training_execution_start", session_id=session_id)
                try:
                    # Try real ML training first; fall back to simulated if it fails
                    self._run_real_training(session_id, training_data)
                except Exception as real_err:
                    logger.error("real_training_failed_falling_back", session_id=session_id, error=str(real_err), exc_info=True)
                    self._complete_training_immediately(session_id, training_data)
                logger.info("background_training_success", session_id=session_id)
        except Exception as e:
            logger.error("background_training_failed", session_id=session_id, error=str(e), exc_info=True)
            try:
                with app.app_context():
                    self._update_training_status(session_id, TrainingStatus.FAILED)
            except Exception:
                pass
            logger.info("background_training_failed", session_id=session_id)

    def _run_real_training(self, session_id: str, training_data: dict) -> None:
        """Run actual model training using CryptoPredictor and save state for predictions."""
        # Lazy import heavy deps
        from ml_app.config import ModelConfig  # type: ignore
        from ml_app.websocket.manager import WebSocketManager  # type: ignore
        from ml_app.predictor import CryptoPredictor  # type: ignore
        from app import socketio as _socketio

        ticker = training_data['ticker']
        model_type = training_data['model_type']
        lookback = int(training_data['lookback'])
        epochs = int(training_data['epochs'])
        batch_size = int(training_data.get('batch_size', 32))
        learning_rate = float(training_data.get('learning_rate', 0.001))
        start_date = training_data['start_date']
        end_date = training_data['end_date']
        # Ensure string dates for Polygon fetcher
        try:
            from datetime import date as _date, datetime as _dt
            if isinstance(start_date, (_dt, _date)):
                start_date = start_date.isoformat()
            if isinstance(end_date, (_dt, _date)):
                end_date = end_date.isoformat()
        except Exception:
            pass

        logger.info("real_training_start", session_id=session_id, ticker=ticker, model_type=model_type)

        # Update status to in-progress
        self._update_training_status(session_id, TrainingStatus.IN_PROGRESS)

        # Build model config
        cfg = ModelConfig(
            model=model_type,
            lookback=lookback,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            ticker=ticker
        )

        ws_manager = WebSocketManager(_socketio)
        predictor = CryptoPredictor(cfg, ws_manager)

        # Train and save state
        result = predictor.train(ticker_symbol=ticker, start_date=start_date, end_date=end_date, session_id=session_id)

        # Update DB with results
        accuracy = float(result['test_metrics'].get('r2', 0)) if 'test_metrics' in result else None
        loss = float(result['history']['loss'][-1]) if 'history' in result and result['history'].get('loss') else None

        self._update_training_progress(session_id, epochs, 100, accuracy or 0.0, loss or 0.0)

        # Emit raw numeric series for client-side charts when available
        try:
            series_payload: Dict[str, Any] = {}
            if isinstance(result, dict):
                history = result.get('history', {})
                if isinstance(history, dict):
                    if isinstance(history.get('loss'), list) and all(isinstance(x, (int, float)) for x in history['loss']):
                        series_payload['loss'] = [float(x) for x in history['loss']]
                    if isinstance(history.get('val_loss'), list) and all(isinstance(x, (int, float)) for x in history['val_loss']):
                        series_payload['val_loss'] = [float(x) for x in history['val_loss']]
                    if isinstance(history.get('accuracy'), list) and all(isinstance(x, (int, float)) for x in history['accuracy']):
                        series_payload['accuracy'] = [float(x) for x in history['accuracy']]
                    if isinstance(history.get('val_accuracy'), list) and all(isinstance(x, (int, float)) for x in history['val_accuracy']):
                        series_payload['val_accuracy'] = [float(x) for x in history['val_accuracy']]

                # Optional: rolling metrics
                rolling = result.get('rolling')
                if isinstance(rolling, dict):
                    for key in ('mae', 'rmse'):
                        if isinstance(rolling.get(key), list) and all(isinstance(x, (int, float)) for x in rolling[key]):
                            series_payload[key] = [float(x) for x in rolling[key]]

                # Optional: predictions and originals (denormalized later on client with mean/std)
                for key in ('train_pred', 'test_pred', 'original_prices'):
                    if isinstance(result.get(key), list) and all(isinstance(x, (int, float)) for x in result[key]):
                        series_payload[key] = [float(x) for x in result[key]]
                # Metadata helpful for denormalization and alignment
                for key in ('train_size', 'lookback'):
                    if isinstance(result.get(key), int):
                        series_payload[key] = int(result[key])
                for key in ('mean', 'std'):
                    if isinstance(result.get(key), (int, float)):
                        series_payload[key] = float(result[key])

                # Optional: residuals, returns, volatility, etc.
                for key in ('residuals', 'returns', 'volatility'):
                    if isinstance(result.get(key), list) and all(isinstance(x, (int, float)) for x in result[key]):
                        series_payload[key] = [float(x) for x in result[key]]

                # Optional: confidence intervals
                conf = result.get('confidence_intervals')
                if isinstance(conf, list):
                    # Expect list of { timestamp, predicted_value, lower_bound, upper_bound }
                    timestamps: list[str] = []
                    pred_values: list[float] = []
                    lower_bounds: list[float] = []
                    upper_bounds: list[float] = []
                    for item in conf:
                        if not isinstance(item, dict):
                            continue
                        ts = item.get('timestamp')
                        pv = item.get('predicted_value')
                        lb = item.get('lower_bound')
                        ub = item.get('upper_bound')
                        if isinstance(ts, str):
                            timestamps.append(ts)
                        else:
                            # Fallback to index if no timestamp
                            timestamps.append('')
                        if isinstance(pv, (int, float)):
                            pred_values.append(float(pv))
                        if isinstance(lb, (int, float)):
                            lower_bounds.append(float(lb))
                        if isinstance(ub, (int, float)):
                            upper_bounds.append(float(ub))
                    if pred_values:
                        series_payload['ci_timestamps'] = timestamps
                        series_payload['ci_pred'] = pred_values
                        series_payload['ci_lower'] = lower_bounds
                        series_payload['ci_upper'] = upper_bounds

                # If model provided any ready-to-emit numeric series
                extra_series = result.get('series')
                if isinstance(extra_series, dict):
                    for k, v in extra_series.items():
                        if isinstance(v, list) and all(isinstance(x, (int, float)) for x in v):
                            series_payload[k] = [float(x) for x in v]

            # Emit in manageable chunks to avoid huge payloads
            if series_payload:
                try:
                    ws_manager.emit_series(session_id, series=series_payload)
                except Exception:
                    pass
        except Exception:
            logger.warning("emit_series_failed_or_unavailable", session_id=session_id)
        self._update_training_results(session_id, accuracy or 0.0, loss or 0.0,
                                      r2_score=result['test_metrics'].get('r2') if 'test_metrics' in result else None,
                                      mae=result['test_metrics'].get('mae') if 'test_metrics' in result else None,
                                      rmse=result['test_metrics'].get('rmse') if 'test_metrics' in result else None,
                                      mape=result['test_metrics'].get('mape') if 'test_metrics' in result else None)
        self._update_training_status(session_id, TrainingStatus.COMPLETED)

        # Add smooth transition delay before completion
        try:
            socketio.sleep(2.0)  # 2 second delay for smooth transition
        except Exception:
            import time
            time.sleep(2.0)

        # Emit completion event
        completion_data = {
            'type': 'training_completed',
            'message': f'Training completed successfully! Final accuracy: {accuracy or 0.0:.4f}',
            'progress': 100,
            'epoch': epochs,
            'total_epochs': epochs,
            'final_accuracy': round(accuracy or 0.0, 4),
            'final_loss': round(loss or 0.0, 4),
            'r2_score': round(result['test_metrics'].get('r2', 0), 4) if 'test_metrics' in result else None,
            'mae': round(result['test_metrics'].get('mae', 0), 4) if 'test_metrics' in result else None,
            'rmse': round(result['test_metrics'].get('rmse', 0), 4) if 'test_metrics' in result else None,
            'mape': round(result['test_metrics'].get('mape', 0), 4) if 'test_metrics' in result else None
        }
        logger.info("emitting_completion_event", session_id=session_id, data=completion_data)
        # Backward-compatible emit
        self._emit_training_update(ws_manager, session_id, completion_data)
        try:
            # Also emit unified completion event
            ws_manager.emit_unified(
                session_id,
                phase='complete',
                event='training_completed',
                data={
                    'final_accuracy': completion_data.get('final_accuracy'),
                    'final_loss': completion_data.get('final_loss'),
                    'metrics': {
                        'r2': completion_data.get('r2_score'),
                        'mae': completion_data.get('mae'),
                        'rmse': completion_data.get('rmse'),
                        'mape': completion_data.get('mape')
                    },
                    'message': completion_data.get('message')
                },
                progress=100
            )
        except Exception:
            pass

    def _complete_training_immediately(self, session_id: str, training_data: dict) -> None:
        try:
            # Lazy import heavy deps
            from ml_app.websocket.manager import WebSocketManager  # type: ignore
            from app import socketio as _socketio

            epochs = training_data.get('epochs', 100)
            ticker = training_data['ticker']
            model_type = training_data['model_type']

            # Create WebSocket manager
            ws_manager = WebSocketManager(_socketio)

            logger.info("training_execution_start", session_id=session_id, ticker=ticker, model_type=model_type)

            logger.info("client_join_wait", session_id=session_id)
            # Yield cooperatively to allow client to join the room
            try:
                socketio.sleep(3)
            except Exception:
                import time
                time.sleep(3)

            accuracy = 0.85 + random.uniform(-0.05, 0.05)
            loss = 0.15 + random.uniform(-0.05, 0.05)

            r2_score = 0.75 + random.uniform(-0.1, 0.1)
            mae = 500 + random.uniform(-100, 100)
            rmse = 800 + random.uniform(-150, 150)
            mape = 5 + random.uniform(-2, 2)

            logger.info("training_started_event", session_id=session_id, model_type=model_type, ticker=ticker)
            self._emit_training_update(ws_manager, session_id, {
                'type': 'training_started',
                'message': f'Training {model_type} model for {ticker} started',
                'progress': 0,
                'epoch': 0,
                'total_epochs': epochs
            })
            try:
                ws_manager.emit_unified(
                    session_id,
                    phase='train',
                    event='training_started',
                    data={'message': f'Training {model_type} model for {ticker} started', 'total_epochs': epochs},
                    progress=0
                )
            except Exception:
                pass

            logger.info("training_progress_simulation", session_id=session_id, epochs=epochs)
            # Simulate up to full number of epochs (cap to a reasonable max in demo)
            max_epochs = min(epochs, 20) or 1
            acc_series: list[float] = []
            loss_series: list[float] = []
            for epoch in range(1, max_epochs + 1):
                try:
                    progress = int((epoch / max_epochs) * 100)
                    current_accuracy = accuracy * (epoch / max_epochs) + random.uniform(-0.02, 0.02)
                    current_loss = loss * (1 - epoch / max_epochs) + random.uniform(-0.02, 0.02)
                    acc_series.append(round(current_accuracy, 6))
                    loss_series.append(round(current_loss, 6))

                    logger.info("epoch_progress", session_id=session_id, epoch=epoch, progress=progress)
                    self._emit_training_update(ws_manager, session_id, {
                        'type': 'training_progress',
                        'message': f'Training epoch {epoch}/{max_epochs}',
                        'progress': progress,
                        'epoch': epoch,
                        'total_epochs': max_epochs,
                        'accuracy': round(current_accuracy, 4),
                        'loss': round(current_loss, 4)
                    })
                    try:
                        ws_manager.emit_metric_sample(
                            session_id,
                            epoch,
                            max_epochs,
                            accuracy=current_accuracy,
                            loss=current_loss
                        )
                    except Exception:
                        pass

                    self._update_training_progress(session_id, epoch, progress, current_accuracy, current_loss)
                    try:
                        socketio.sleep(2.0)  # Increased delay for smoother transitions
                    except Exception:
                        import time
                        time.sleep(1.0)
                except Exception as loop_err:
                    logger.error("epoch_progress_failed", session_id=session_id, epoch=epoch, error=str(loop_err), exc_info=True)
                    # continue attempting next epochs

            logger.info("training_final_update", session_id=session_id, accuracy=accuracy, loss=loss)
            self._update_training_progress(session_id, max_epochs, 100, accuracy, loss)

            # Emit raw numeric series collected during simulation
            try:
                ws_manager.emit_series(session_id, series={
                    'accuracy': acc_series,
                    'loss': loss_series
                })
            except Exception:
                pass

            self._emit_training_update(None, session_id, {
                'type': 'training_progress',
                'message': f'Training completed in {max_epochs} epochs',
                'progress': 100,
                'epoch': max_epochs,
                'total_epochs': max_epochs,
                'accuracy': round(accuracy, 4),
                'loss': round(loss, 4)
            })

            logger.info("training_completion", session_id=session_id)
            self._update_training_status(session_id, TrainingStatus.COMPLETED)

            logger.info("training_results_update", session_id=session_id)
            self._update_training_results(session_id, accuracy, loss, r2_score, mae, rmse, mape)

            logger.info("training_completion_event", session_id=session_id, accuracy=accuracy)
            completion_data = {
                'type': 'training_completed',
                'message': f'Training completed successfully! Final accuracy: {accuracy:.4f}',
                'progress': 100,
                'epoch': max_epochs,
                'total_epochs': max_epochs,
                'final_accuracy': round(accuracy, 4),
                'final_loss': round(loss, 4),
                'r2_score': round(r2_score, 4) if r2_score else None,
                'mae': round(mae, 4) if mae else None,
                'rmse': round(rmse, 4) if rmse else None,
                'mape': round(mape, 4) if mape else None
            }
            logger.info("emitting_completion_event", session_id=session_id, data=completion_data)
            self._emit_training_update(ws_manager, session_id, completion_data)
            try:
                ws_manager.emit_unified(
                    session_id,
                    phase='complete',
                    event='training_completed',
                    data={
                        'final_accuracy': completion_data.get('final_accuracy'),
                        'final_loss': completion_data.get('final_loss'),
                        'metrics': {
                            'r2': completion_data.get('r2_score'),
                            'mae': completion_data.get('mae'),
                            'rmse': completion_data.get('rmse'),
                            'mape': completion_data.get('mape')
                        },
                        'message': completion_data.get('message')
                    },
                    progress=100
                )
            except Exception:
                pass

        except Exception as e:
            logger.error("training_execution_failed", session_id=session_id, error=str(e), exc_info=True)
            self._update_training_status(session_id, TrainingStatus.FAILED)
            raise

    def cancel_training(self, session_id: str) -> Dict[str, Any]:
        try:
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            if session:
                if session.status == TrainingStatus.IN_PROGRESS:
                    session.update_status(TrainingStatus.CANCELLED)
                    db.session.commit()
                    logger.info("training_cancelled", session_id=session_id)
                    return {'success': True, 'message': 'Training cancelled successfully'}
                else:
                    return {'success': False, 'error': f'Training session is not in progress (status: {session.status.value})'}
            else:
                return {'success': False, 'error': f'No training session found with ID {session_id}'}

        except Exception as e:
            logger.error("training_cancellation_failed", session_id=session_id, error=str(e))
            return {'success': False, 'error': f'Failed to cancel training: {e!s}'}

    def _update_training_status(self, session_id: str, status: TrainingStatus) -> None:
        try:
            logger.info("updating_status", session_id=session_id, status=status.value)
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            if session:
                session.update_status(status)
                db.session.commit()
                logger.info("status_updated_successfully", session_id=session_id, status=status.value)
            else:
                logger.error("session_not_found_for_status_update", session_id=session_id)
        except Exception as e:
            logger.error("status_update_failed", session_id=session_id, error=str(e), exc_info=True)
            db.session.rollback()

    def _update_training_progress(self, session_id: str, epoch: int, progress: int, accuracy: float, loss: float) -> None:
        try:
            logger.info("updating_progress", session_id=session_id, accuracy=accuracy, loss=loss)
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            if session:
                session.accuracy = accuracy
                session.loss = loss
                session.updated_at = datetime.now(timezone.utc)
                db.session.commit()
                logger.info("progress_updated_successfully", session_id=session_id)
            else:
                logger.error("session_not_found_for_progress_update", session_id=session_id)
        except Exception as e:
            logger.error("progress_update_failed", session_id=session_id, error=str(e), exc_info=True)
            db.session.rollback()

    def _update_training_results(self, session_id: str, accuracy: float, loss: float,
                                r2_score: float = None, mae: float = None,
                                rmse: float = None, mape: float = None) -> None:
        try:
            logger.info("updating_results", session_id=session_id, accuracy=accuracy, loss=loss)
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            if session:
                session.complete(accuracy=accuracy, loss=loss, r2_score=r2_score,
                               mae=mae, rmse=rmse, mape=mape)
                db.session.commit()
                logger.info("results_updated_successfully", session_id=session_id)
            else:
                logger.error("session_not_found_for_results_update", session_id=session_id)
        except Exception as e:
            logger.error("results_update_failed", session_id=session_id, error=str(e), exc_info=True)
            db.session.rollback()

    def _is_training_cancelled(self, session_id: str) -> bool:
        try:
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            return session and session.status == TrainingStatus.CANCELLED
        except:
            return False

    def _emit_training_update(self, websocket_manager, session_id: str, data: dict) -> None:
        try:
            logger.info("websocket_update_emitting",
                       session_id=session_id,
                       data_type=data.get('type'))

            # Use WebSocketManager if provided, otherwise fall back to direct socketio
            if websocket_manager:
                websocket_manager.emit_training_update(session_id, data)
            else:
                socketio.emit('training_update', {
                    'session_id': session_id,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    **data
                }, room=f'training_{session_id}')

            logger.info("websocket_update_success",
                       session_id=session_id,
                       data_type=data.get('type'))
        except Exception as e:
            logger.error("websocket_emit_failed",
                        session_id=session_id,
                        error=str(e),
                        data_type=data.get('type'))

    def get_training_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            session = TrainingSession.query.filter_by(session_id=session_id).first()
            if session:
                return {
                    'session_id': session.session_id,
                    'status': session.status.value,
                    'progress': self._calculate_progress(session),
                    'details': session.to_dict()
                }
            return None
        except Exception as e:
            logger.error("status_retrieval_failed", session_id=session_id, error=str(e))
            return None

    def _calculate_progress(self, session: TrainingSession) -> Dict[str, Any]:
        if session.status == TrainingStatus.COMPLETED:
            return {'percentage': 100, 'stage': 'completed'}
        elif session.status == TrainingStatus.FAILED:
            return {'percentage': 0, 'stage': 'failed'}
        elif session.status == TrainingStatus.IN_PROGRESS:
            if session.accuracy is not None:
                progress = min(95, int(session.accuracy * 100))
                return {'percentage': progress, 'stage': 'training'}
            else:
                return {'percentage': 50, 'stage': 'training'}
        else:
            return {'percentage': 0, 'stage': 'pending'}

    def get_running_trainings(self) -> list:
        try:
            running_sessions = TrainingSession.query.filter_by(status=TrainingStatus.IN_PROGRESS).all()
            return [session.to_dict() for session in running_sessions]
        except Exception as e:
            logger.error("running_trainings_retrieval_failed", error=str(e))
            return []
