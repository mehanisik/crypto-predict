from datetime import datetime, timedelta
from typing import List, Dict, Optional
import numpy as np
from pathlib import Path
from joblib import dump, load  # type: ignore
import structlog
import tensorflow as tf  # type: ignore
import pandas as pd  # type: ignore

from .config import ModelConfig
from .data.processor import DataProcessor
from .models import CNNModel, LSTMModel, CNNLSTMModel, LSTMCNNModel
from .websocket.manager import WebSocketManager
from .data.metrics_calculator import MetricsCalculator
from .visualization.visualizer import Visualizer

BASE_DIR = Path(__file__).resolve().parents[1]
LATEST_MODEL_PATH = (BASE_DIR / "models" / "latest_model.joblib").resolve()

class CryptoPredictor:
    def __init__(self, config: ModelConfig, websocket_manager: WebSocketManager):
        self.config = config
        self.model = None
        self.data_processor = DataProcessor(config)
        self.visualizer = None
        self.websocket_manager = websocket_manager
        self.logger = structlog.get_logger(__name__)

    def _get_model_builder(self):
        """Get the appropriate model builder based on configuration."""
        from .models import CNNModel, LSTMModel, CNNLSTMModel, LSTMCNNModel

        model_map = {
            'CNN': CNNModel,
            'LSTM': LSTMModel,
            'CNN-LSTM': CNNLSTMModel,
            'LSTM-CNN': LSTMCNNModel
        }

        model_class = model_map.get(self.config.model)
        if not model_class:
            raise ValueError(f"Unsupported model type: {self.config.model}")

        return model_class()

    def train(self, ticker_symbol: str, start_date: str, end_date: str, *, session_id: str) -> Dict:
        """
        Train the model on the specified stock data.
        
        Args:
            ticker_symbol: Stock ticker symbol
            start_date: Training data start date
            end_date: Training data end date
            
        Returns:
            Dict containing training results, metrics, and plots
        """
        try:
            training_start_time = datetime.now()
            self.logger.info("training_started",
                           ticker=ticker_symbol,
                           start_date=start_date,
                           end_date=end_date)

            # Data fetching stage
            self.websocket_manager.emit_stage(session_id, 'data_fetching', {
                'status': 'started',
                'ticker': ticker_symbol,
                'start_date': start_date,
                'end_date': end_date,
                'message': f'Fetching {ticker_symbol} data from {start_date} to {end_date}'
            })

            # Prepare data with multiple features
            (X_train, y_train), (X_test, y_test), original_prices = \
                self.data_processor.fetch_and_prepare_data(ticker_symbol, start_date, end_date, use_multiple_features=True)

            # Emit fetched data summary
            try:
                self.websocket_manager.emit_stage(session_id, 'data_fetched', {
                    'rows': len(original_prices),
                    'train_samples': len(X_train),
                    'test_samples': len(X_test),
                    'lookback': int(self.config.lookback),
                    'message': f'Retrieved {len(original_prices)} data points ({len(X_train)} train, {len(X_test)} test)'
                })
            except Exception as e:
                self.logger.warning("data_fetched_emit_failed", error=str(e))

            # Preprocessing stage
            self.websocket_manager.emit_stage(session_id, 'preprocessing', {
                'status': 'completed',
                'train_shape': list(X_train.shape),
                'test_shape': list(X_test.shape),
                'target_shape_train': list(y_train.shape),
                'target_shape_test': list(y_test.shape),
                'features': int(X_train.shape[2]),
                'message': f'Preprocessed data: {X_train.shape[2]} features, {X_train.shape[0]} training samples'
            })

            # Feature engineering stage
            self.websocket_manager.emit_stage(session_id, 'feature_engineering', {
                'status': 'using_features',
                'features': int(X_train.shape[2]),
                'lookback': int(self.config.lookback),
                'message': f'Using {X_train.shape[2]} engineered features with {self.config.lookback} lookback period'
            })

            # Model building stage
            self.websocket_manager.emit_stage(session_id, 'model_building', {
                'status': 'started',
                'model_type': self.config.model,
                'input_shape': list(X_train.shape[1:]),
                'epochs': int(self.config.epochs),
                'batch_size': int(self.config.batch_size),
                'learning_rate': float(self.config.learning_rate),
                'message': f'Building {self.config.model} model with {self.config.epochs} epochs'
            })

            # Build model
            model_builder = self._get_model_builder()
            self.model = model_builder.build(input_shape=X_train.shape[1:])

            # Model info stage
            self.websocket_manager.emit_stage(session_id, 'model_info', {
                'status': 'built',
                'input_shape': list(X_train.shape[1:]),
                'model_type': self.config.model,
                'message': f'{self.config.model} model built successfully with input shape {X_train.shape[1:]}'
            })

            # WebSocket callback for real-time updates
            class WSCallback(tf.keras.callbacks.Callback):
                def __init__(self, predictor, session_id: str):
                    super().__init__()
                    self.predictor = predictor
                    self.session_id = session_id
                    self.training_start = datetime.now()
                    self.last_update = datetime.now()
                    self.update_interval = 0.3  # More frequent updates for smoother progress
                    self.total_epochs = predictor.config.epochs

                def on_train_begin(self, logs=None):
                    # Initial stage notification
                    self.predictor.websocket_manager.emit_stage(
                        self.session_id,
                        'training_update',
                        {
                            'status': 'started',
                            'message': f'Starting {self.total_epochs} epochs of model training',
                            'total_epochs': self.total_epochs,
                            'progress': 0
                        }
                    )

                def on_epoch_end(self, epoch, logs=None):
                    current_time = datetime.now()

                    # Check if enough time has passed since last update
                    if (current_time - self.last_update).total_seconds() >= self.update_interval:
                        accuracy = logs.get('accuracy', 0) if logs else 0
                        loss = logs.get('loss', 0) if logs else 0
                        val_accuracy = logs.get('val_accuracy', 0) if logs else 0
                        val_loss = logs.get('val_loss', 0) if logs else 0

                        # Use the new progress tracking system
                        self.predictor.websocket_manager.emit_training_progress(
                            self.session_id,
                            epoch + 1,  # epoch is 0-indexed
                            self.total_epochs,
                            accuracy,
                            loss
                        )
                        # Stream raw metric sample for client-side plotting
                        try:
                            self.predictor.websocket_manager.emit_metric_sample(
                                self.session_id,
                                epoch + 1,
                                self.total_epochs,
                                accuracy=accuracy,
                                loss=loss,
                                val_accuracy=val_accuracy,
                                val_loss=val_loss
                            )
                        except Exception:
                            pass

                        self.last_update = current_time

            # Train the model
            callback = WSCallback(self, session_id)
            history = self.model.fit(
                X_train, y_train,
                epochs=self.config.epochs,
                batch_size=self.config.batch_size,
                validation_data=(X_test, y_test),
                callbacks=[callback],
                verbose=0
            )

            # Generate predictions
            self.logger.info("generating_predictions")
            y_pred_train = self.model.predict(X_train, verbose=0)
            y_pred_test = self.model.predict(X_test, verbose=0)

            # Evaluation stage with detailed progress
            self.logger.info("starting_evaluation")
            metrics_to_calculate = ['mae', 'rmse', 'r2', 'mape']

            for i, metric in enumerate(metrics_to_calculate):
                self.websocket_manager.emit_evaluation_progress(
                    session_id,
                    metric,
                    len(metrics_to_calculate),
                    i + 1
                )

            # Calculate metrics
            metrics_calc = MetricsCalculator()
            train_metrics = metrics_calc.calculate_metrics(y_train, y_pred_train.flatten(), self.data_processor.mean, self.data_processor.std)
            test_metrics = metrics_calc.calculate_metrics(y_test, y_pred_test.flatten(), self.data_processor.mean, self.data_processor.std)

            # Final evaluation update
            self.websocket_manager.emit_stage(session_id, 'evaluating_update', {
                'type': 'evaluation',
                'metrics': {
                    'train': train_metrics,
                    'test': test_metrics
                },
                'progress': 100,
                'message': f'Evaluation complete: R²={test_metrics.get("r2", 0):.4f}, MAE={test_metrics.get("mae", 0):.4f}'
            })

            # Prepare and emit raw series for client-side visualization
            try:
                # Training history series
                series: Dict[str, List[float]] = {}
                if 'loss' in history.history:
                    series['loss'] = [float(x) for x in history.history['loss']]
                if 'accuracy' in history.history:
                    series['accuracy'] = [float(x) for x in history.history['accuracy']]
                if 'val_loss' in history.history:
                    series['val_loss'] = [float(x) for x in history.history['val_loss']]
                if 'val_accuracy' in history.history:
                    series['val_accuracy'] = [float(x) for x in history.history['val_accuracy']]

                # Denormalize predictions for series
                if hasattr(self.data_processor, 'mean') and hasattr(self.data_processor, 'std'):
                    mean = self.data_processor.mean
                    std = self.data_processor.std
                    if isinstance(mean, (list, tuple, np.ndarray)):
                        mean_target = float(np.array(mean)[-1])
                        std_target = float(np.array(std)[-1])
                    else:
                        mean_target = float(mean)
                        std_target = float(std)
                else:
                    mean_target = 0.0
                    std_target = 1.0

                y_pred_train_denorm = (y_pred_train.flatten() * (std_target if std_target != 0 else 1.0)) + mean_target
                y_pred_test_denorm = (y_pred_test.flatten() * (std_target if std_target != 0 else 1.0)) + mean_target
                y_train_denorm = (y_train.flatten() * (std_target if std_target != 0 else 1.0)) + mean_target
                y_test_denorm = (y_test.flatten() * (std_target if std_target != 0 else 1.0)) + mean_target

                # Convert to lists for JSON
                series_predictions: Dict[str, List[float]] = {
                    'y_train': [float(x) for x in y_train_denorm],
                    'y_pred_train': [float(x) for x in y_pred_train_denorm],
                    'y_test': [float(x) for x in y_test_denorm],
                    'y_pred_test': [float(x) for x in y_pred_test_denorm]
                }

                # Emit history series first
                if series:
                    self.websocket_manager.emit_series(session_id, series=series, meta={'kind': 'training_history'})
                
                # Emit prediction vs. actual series
                self.websocket_manager.emit_series(session_id, series=series_predictions, meta={'kind': 'predictions_vs_actual'})
            except Exception as viz_err:
                self.logger.warning("series_emit_failed", error=str(viz_err))

            # Generate and emit plots
            try:
                plots = self._generate_visualizations(history, y_train, y_pred_train, y_test, y_pred_test, original_prices, session_id)
                if plots:
                    # Send plot URLs via websocket using emit_unified directly
                    self.websocket_manager.emit_unified(
                        session_id, 
                        phase='visualize', 
                        event='series', 
                        data={'series': plots, 'meta': {'kind': 'plots'}}
                    )
            except Exception as plot_err:
                self.logger.error("plot_generation_failed", session_id=session_id, error=str(plot_err), exc_info=True)

            # Save model state
            self._save_state()

            # Calculate final metrics
            final_accuracy = test_metrics.get('r2', 0)
            final_loss = history.history['loss'][-1] if history.history.get('loss') else 0

            # Log completion
            training_duration = (datetime.now() - training_start_time).total_seconds()
            self.logger.info("training_completed",
                           ticker=ticker_symbol,
                           duration=training_duration,
                           train_metrics=train_metrics,
                           test_metrics=test_metrics)

            # Emit completion using new system
            final_data = {
                'message': f'Training completed successfully! Final accuracy: {final_accuracy:.4f}',
                'epoch': self.config.epochs,
                'total_epochs': self.config.epochs,
                'final_accuracy': round(final_accuracy, 4),
                'final_loss': round(final_loss, 4),
                'r2_score': round(test_metrics.get('r2', 0), 4),
                'mae': round(test_metrics.get('mae', 0), 4),
                'rmse': round(test_metrics.get('rmse', 0), 4),
                'mape': round(test_metrics.get('mape', 0), 4),
                'training_duration': round(training_duration, 2)
            }

            self.websocket_manager.emit_completion(session_id, final_data)

            return {
                'history': history.history,
                'train_metrics': train_metrics,
                'test_metrics': test_metrics,
                'model_path': str(LATEST_MODEL_PATH)
            }

        except Exception as e:
            self.logger.error("training_failed", error=str(e), exc_info=True)
            raise

    def _save_state(self):
        """Save model and processor state"""
        state = {
            'model_weights': self.model.get_weights(),
            'model_config': self.model.get_config(),
            'data_processor': {
                'mean': self.data_processor.mean,
                'std': self.data_processor.std,
                'df': self.data_processor.df.to_dict(),
                'config': self.config.__dict__
            }
        }
        # Persist number of features used during training to reconstruct input shape
        try:
            if hasattr(self.data_processor, 'df') and self.data_processor.df is not None:
                state['num_features'] = len(self.data_processor.df.columns)
            else:
                state['num_features'] = 1
        except Exception:
            state['num_features'] = 1
        dump(state, LATEST_MODEL_PATH)
        self.logger.info("model_state_saved", path=str(LATEST_MODEL_PATH))

    @classmethod
    def load_latest(cls, websocket_manager: WebSocketManager) -> Optional['CryptoPredictor']:
        """Load the latest saved model state"""
        try:
            if not LATEST_MODEL_PATH.exists():
                return None

            state = load(LATEST_MODEL_PATH)
            config = ModelConfig(**state['data_processor']['config'])
            predictor = cls(config, websocket_manager)

            # Rebuild model and set weights
            if config.model == "CNN":
                model_builder = CNNModel()
            elif config.model == "LSTM":
                model_builder = LSTMModel()
            elif config.model == "CNN-LSTM":
                model_builder = CNNLSTMModel()
            elif config.model == "LSTM-CNN":
                model_builder = LSTMCNNModel()
            else:
                raise ValueError(f"Invalid model: {config.model}")

            # Rebuild model with training-time feature count
            num_features = state.get('num_features')
            if not num_features:
                mean = state['data_processor'].get('mean')
                try:
                    import numpy as np
                    num_features = int(np.array(mean).shape[0]) if mean is not None and hasattr(mean, '__len__') else 1
                except Exception:
                    num_features = 1
            predictor.model = model_builder.build((config.lookback, num_features))
            try:
                predictor.model.set_weights(state['model_weights'])
            except Exception as weight_err:
                # If weights mismatch (e.g., architecture drift), log and continue with fresh model
                structlog.get_logger(__name__).error("failed_to_set_weights", error=str(weight_err))

            # Restore data processor state
            predictor.data_processor.mean = state['data_processor']['mean']
            predictor.data_processor.std = state['data_processor']['std']
            predictor.data_processor.df = pd.DataFrame.from_dict(state['data_processor']['df'])

            return predictor
        except Exception as e:
            # Use module logger since classmethod has no instance logger
            structlog.get_logger(__name__).error("failed_to_load_model", error=str(e), exc_info=True)
            return None

    def predict(self, data: np.ndarray) -> np.ndarray:
        """
        Make predictions using the trained model.
        
        Args:
            data: Input data array
            
        Returns:
            Array of predictions
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        try:
            predictions = self.model.predict(data, verbose=0)
            return predictions.squeeze()
        except Exception as e:
            self.logger.error("prediction_failed", error=str(e), exc_info=True)
            raise

    def save_model(self, path: str) -> None:
        """
        Save the trained model to disk.
        
        Args:
            path: Path to save the model
        """
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")

        try:
            self.model.save(path)
            self.logger.info("model_saved", path=path)
        except Exception as e:
            self.logger.error("model_save_failed", path=path, error=str(e), exc_info=True)
            raise

    def load_model(self, path: str) -> None:
        """
        Load a trained model from disk.
        
        Args:
            path: Path to the saved model
        """
        try:
            self.model = tf.keras.models.load_model(path)
            self.logger.info("model_loaded", path=path)
        except Exception as e:
            self.logger.error("model_load_failed", path=path, error=str(e), exc_info=True)
            raise

    def predict_multiple_days(self, initial_data: np.ndarray, days: int) -> List[Dict[str, float]]:
        """
        Predict stock prices for multiple days ahead.
        
        Args:
            initial_data: Initial historical data
            days: Number of days to predict
            
        Returns:
            List of dictionaries containing predictions and confidence metrics
        """
        try:
            predictions = []
            current_window = initial_data.copy()

            # Calculate volatility proxy on target feature (last column if multi-feature)
            if isinstance(self.data_processor.std, (list, tuple, np.ndarray)):
                target_std = float(np.array(self.data_processor.std)[-1])
            else:
                target_std = float(self.data_processor.std)
            try:
                target_series = current_window[:, -1]
            except Exception:
                target_series = current_window
            historical_volatility = target_std * float(np.std(target_series))

            # Increase uncertainty for further predictions
            base_uncertainty = historical_volatility * 2  # Double the historical volatility for base uncertainty

            for day in range(days):
                # Prepare prediction window
                input_data = current_window[-self.config.lookback:]
                if hasattr(input_data, 'shape') and len(input_data.shape) == 1:
                    input_data = input_data.reshape(self.config.lookback, 1)
                expected_features = int(self.model.input_shape[-1]) if self.model is not None else input_data.shape[-1]
                if len(input_data.shape) == 2 and input_data.shape[-1] > expected_features:
                    input_data = input_data[:, -expected_features:]
                input_data = input_data.reshape(1, self.config.lookback, expected_features)

                # Make prediction
                prediction = self.model.predict(input_data, verbose=0)
                if isinstance(self.data_processor.mean, (list, tuple, np.ndarray)):
                    mean_target = float(np.array(self.data_processor.mean)[-1])
                    std_target = float(np.array(self.data_processor.std)[-1])
                else:
                    mean_target = float(self.data_processor.mean)
                    std_target = float(self.data_processor.std)
                predicted_value = float(prediction[0, 0] * (std_target if std_target != 0 else 1.0) + mean_target)

                # Increase confidence interval with time
                time_factor = 1 + (day * 0.1)  # 10% increase in uncertainty per day
                confidence_interval = base_uncertainty * time_factor

                prediction_date = datetime.now() + timedelta(days=day+1)

                prediction_data = {
                    'day': day + 1,
                    'predicted_price': predicted_value,
                    'confidence_interval': float(confidence_interval),
                    'lower_bound': float(predicted_value - confidence_interval),
                    'upper_bound': float(predicted_value + confidence_interval),
                    'timestamp': prediction_date.isoformat(),
                    'volatility_factor': float(time_factor)
                }

                predictions.append(prediction_data)

                # Update window with prediction for next iteration
                norm_pred = (predicted_value - mean_target) / (std_target if std_target != 0 else 1.0)
                if hasattr(current_window, 'shape') and len(current_window.shape) > 1:
                    next_row = current_window[-1].copy()
                    next_row[-1] = norm_pred
                    current_window = np.vstack([current_window[1:], next_row])
                else:
                    current_window = np.append(current_window[1:], norm_pred)

            return predictions

        except Exception as e:
            self.logger.error("multi_day_prediction_failed",
                            error=str(e),
                            exc_info=True)
            raise

    def _generate_specific_plot(self, plot_name: str, history, y_train, y_pred_train, y_test, y_pred_test, original_prices, session_id: str):
        """Generate a specific plot with progress tracking"""
        try:

            # Denormalize predictions
            if hasattr(self.data_processor, 'mean') and hasattr(self.data_processor, 'std'):
                mean = self.data_processor.mean
                std = self.data_processor.std

                # Handle multi-feature case
                if isinstance(mean, (list, tuple, np.ndarray)):
                    mean_target = float(np.array(mean)[-1])
                    std_target = float(np.array(std)[-1])
                else:
                    mean_target = float(mean)
                    std_target = float(std)

                y_pred_train_denorm = y_pred_train.flatten() * std_target + mean_target
                y_pred_test_denorm = y_pred_test.flatten() * std_target + mean_target
                y_train_denorm = y_train.flatten() * std_target + mean_target
                y_test_denorm = y_test.flatten() * std_target + mean_target
            else:
                y_pred_train_denorm = y_pred_train.flatten()
                y_pred_test_denorm = y_pred_test.flatten()
                y_train_denorm = y_train.flatten()
                y_test_denorm = y_test.flatten()

            train_size = len(y_train)
            lookback = self.config.lookback

            # Generate specific plot based on name
            plot_url = None
            if plot_name == 'loss_history':
                plot_url = Visualizer.plot_loss_history(history, ax=None)
            elif plot_name == 'price_predictions':
                plot_url = Visualizer.plot_predictions(
                    original_prices, y_pred_train_denorm, y_pred_test_denorm,
                    train_size, lookback, mean_target, std_target, ax=None
                )
            elif plot_name == 'residuals':
                plot_url = Visualizer.plot_residuals(
                    y_test_denorm, y_pred_test_denorm, mean_target, std_target, ax=None
                )
            elif plot_name == 'rolling_metrics':
                plot_url = Visualizer.plot_rolling_metrics(
                    y_test_denorm, y_pred_test_denorm, mean_target, std_target, ax=None
                )
            else:
                self.logger.warning(f"Unknown plot type: {plot_name}")
                return None
            
            return plot_url

        except Exception as e:
            self.logger.error(f"Failed to generate {plot_name} plot", error=str(e))
            return None

    def _generate_visualizations(self, history, y_train, y_pred_train, y_test, y_pred_test, original_prices, session_id: str):
        """Generate all visualizations (legacy method for backward compatibility)"""
        plots = {}
        plot_names = [
            'loss_history', 'price_predictions', 'residuals', 'rolling_metrics'
        ]

        for plot_name in plot_names:
            plot_data = self._generate_specific_plot(
                plot_name, history, y_train, y_pred_train, y_test, y_pred_test,
                original_prices, session_id
            )
            if plot_data:
                plots[plot_name] = plot_data

        return plots


