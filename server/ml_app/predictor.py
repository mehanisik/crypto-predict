from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
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

# Use container app root (/app) as base so models map to /app/models
BASE_DIR = Path(__file__).resolve().parents[1]
LATEST_MODEL_PATH = (BASE_DIR / "models" / "latest_model.joblib").resolve()

class CryptoPredictor:
    def __init__(self, config: ModelConfig, websocket_manager: WebSocketManager):
        self.config = config
        self.model = None
        self.data_processor = DataProcessor(config)
        # Visualizer is heavy (matplotlib/seaborn); import lazily in training path
        self.visualizer = None
        self.websocket_manager = websocket_manager
        self.logger = structlog.get_logger(__name__)

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
                'end_date': end_date
            })

            # Prepare data with multiple features
            (X_train, y_train), (X_test, y_test), original_prices = \
                self.data_processor.fetch_and_prepare_data(ticker_symbol, start_date, end_date, use_multiple_features=True)

            # Emit fetched data summary
            try:
                self.websocket_manager.emit_stage(session_id, 'data_fetched', {
                    'rows': int(len(original_prices)),
                    'train_samples': int(len(X_train)),
                    'test_samples': int(len(X_test)),
                    'lookback': int(self.config.lookback)
                })
            except Exception as e:
                self.logger.warning("data_fetched_emit_failed", error=str(e))

            # WebSocket callback for real-time updates
            class WSCallback(tf.keras.callbacks.Callback):
                def __init__(self, predictor, session_id: str):
                    super().__init__()
                    self.predictor = predictor
                    self.session_id = session_id
                    self.training_start = datetime.now()
                    self.last_update = datetime.now()
                    self.update_interval = 0.5  # Reduce update interval for more frequent updates
                    self.progress_smoothing = 0.0  # Exponential smoothing for progress
                    self.total_epochs = predictor.config.epochs

                def on_train_begin(self, logs=None):
                    # Initial stage notification
                    self.predictor.websocket_manager.emit_stage(
                        self.session_id,
                        'training_update',
                        {
                            'status': 'started',
                            'message': 'Model training initiated',
                            'total_epochs': self.total_epochs,
                            'progress': 0
                        }
                    )

                def on_epoch_begin(self, epoch, logs=None):
                    self.epoch_start = datetime.now()

                def on_epoch_end(self, epoch, logs=None):
                    current_progress = ((epoch + 1) / self.total_epochs) * 100
                    update_data = {
                        'epoch': epoch + 1,
                        'total_epochs': self.total_epochs,
                        'loss': float(logs.get('loss', 0)),
                        'val_loss': float(logs.get('val_loss', 0)),
                        'progress': current_progress,
                        'status': 'training',
                        'message': f'Epoch {epoch + 1}/{self.total_epochs} completed'
                    }
                    
                    # Force immediate update
                    self.predictor.websocket_manager.socketio.sleep(0)
                    self.predictor.websocket_manager.emit_stage(
                        self.session_id,
                        'training_update',
                        update_data
                    )

                def on_train_end(self, logs=None):
                    # Final training stage completion
                    final_update = {
                        'status': 'completed',
                        'message': 'Model training finished successfully',
                        'progress': 100,
                        'total_epochs': self.total_epochs
                    }
                    self.predictor.websocket_manager.emit_stage(
                        self.session_id,
                        'training_update',
                        final_update
                    )

            # Preprocessing summary
            try:
                features_count = X_train.shape[-1] if len(X_train.shape) == 3 else 1
                self.websocket_manager.emit_stage(session_id, 'preprocessing', {
                    'status': 'completed',
                    'train_shape': list(X_train.shape),
                    'test_shape': list(X_test.shape),
                    'target_shape_train': list(y_train.shape),
                    'target_shape_test': list(y_test.shape),
                    'features': int(features_count)
                })
            except Exception as e:
                self.logger.warning("preprocessing_emit_failed", error=str(e))

            # Initialize model
            self.logger.info("initializing_model")
            

            if self.config.model == "CNN":
                model_builder = CNNModel()
            elif self.config.model == "LSTM":
                model_builder = LSTMModel()
            elif self.config.model == "CNN-LSTM":
                model_builder = CNNLSTMModel()
            elif self.config.model == "LSTM-CNN":
                model_builder = LSTMCNNModel()
            else:
                raise ValueError(f"Invalid model: {self.config.model}")
            
            # Determine input shape based on features
            if hasattr(self.data_processor, 'df') and self.data_processor.df is not None:
                # Use actual number of features from data
                num_features = len(self.data_processor.df.columns)
                input_shape = (self.config.lookback, num_features)
            else:
                # Default to 5 features (OHLCV)
                input_shape = (self.config.lookback, 5)
            
            # Feature engineering & model building emits
            try:
                self.websocket_manager.emit_stage(session_id, 'feature_engineering', {
                    'status': 'using_features',
                    'features': int(input_shape[-1]),
                    'lookback': int(input_shape[0])
                })

                self.websocket_manager.emit_stage(session_id, 'model_building', {
                    'status': 'started',
                    'model_type': self.config.model,
                    'input_shape': list(input_shape),
                    'epochs': int(self.config.epochs),
                    'batch_size': int(self.config.batch_size),
                    'learning_rate': float(self.config.learning_rate)
                })

                self.model = model_builder.build(input_shape)

                self.websocket_manager.emit_stage(session_id, 'model_info', {
                    'status': 'built',
                    'input_shape': list(input_shape),
                    'model_type': self.config.model
                })
            except Exception as e:
                self.logger.warning("model_building_emit_failed", error=str(e))
            
            # Add early stopping callback
            from tensorflow.keras.callbacks import EarlyStopping
            
            early_stopping = EarlyStopping(
                monitor='val_loss',
                patience=self.config.early_stopping_patience,
                restore_best_weights=True,
                verbose=0
            )
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=self.config.epochs,
                batch_size=self.config.batch_size,
                verbose=0,  # Disable default progress bar
                callbacks=[WSCallback(self, session_id), early_stopping]
            )

            # Generate and validate predictions
            self.logger.info("generating_predictions")
            train_pred = self.model.predict(X_train, verbose=0)
            test_pred = self.model.predict(X_test, verbose=0)
            
            # Ensure predictions are arrays, not scalars
            if train_pred.ndim == 0:
                train_pred = np.array([train_pred])
            else:
                train_pred = train_pred.squeeze()
                
            if test_pred.ndim == 0:
                test_pred = np.array([test_pred])
            else:
                test_pred = test_pred.squeeze()
            
            # Ensure predictions and targets have the same shape
            if train_pred.shape != y_train.shape:
                self.logger.warning("train_pred_shape_mismatch", 
                                  pred_shape=train_pred.shape, 
                                  target_shape=y_train.shape)
                # Reshape if possible
                if train_pred.size == y_train.size:
                    train_pred = train_pred.reshape(y_train.shape)
                    
            if test_pred.shape != y_test.shape:
                self.logger.warning("test_pred_shape_mismatch", 
                                  pred_shape=test_pred.shape, 
                                  target_shape=y_test.shape)
                # Reshape if possible
                if test_pred.size == y_test.size:
                    test_pred = test_pred.reshape(y_test.shape)
            
            # Evaluation stage
            self.logger.info("starting_evaluation")
            self.websocket_manager.socketio.sleep(1)  # Add initial delay

            # Add proper progress increments with realistic timing
            metrics_list = ['mae', 'rmse', 'r2', 'mape']
            total_metrics = len(metrics_list)

            for i, metric in enumerate(metrics_list, 1):
                progress = (i / total_metrics) * 100
                self.websocket_manager.emit_stage(session_id, "evaluating_update", {
                    'current_metric': metric,
                    'total_metrics': total_metrics,
                    'progress': progress,
                    'message': f'Calculating {metric.upper()} metric'
                })
                self.websocket_manager.socketio.sleep(2)  # Realistic processing time

            # Calculate actual metrics
            train_metrics = MetricsCalculator.calculate_metrics(
                y_train, train_pred, self.data_processor.mean, self.data_processor.std
            )
            test_metrics = MetricsCalculator.calculate_metrics(
                y_test, test_pred, self.data_processor.mean, self.data_processor.std
            )

            self.websocket_manager.socketio.sleep(1)  # Add delay before final metrics
            self.websocket_manager.emit_stage(session_id, "evaluating_update", {
                'type': 'evaluation',
                'metrics': {
                    'train': train_metrics,
                    'test': test_metrics
                },
                'progress': 100
            })
            self.websocket_manager.socketio.sleep(2)  # Add longer delay before visualization stage

            # Generate visualization plots (lazy import to avoid seaborn/matplotlib on predict path)
            from .visualization.visualizer import Visualizer  # type: ignore
            if self.visualizer is None:
                self.visualizer = Visualizer()
            self.logger.info("generating_visualizations")
            self.websocket_manager.socketio.sleep(1)  # Add delay before starting visualizations

            plots = {}
            visualization_tasks = [
        {
            'name': 'training_history',
            'title': 'Training History',
            'function': self.visualizer.plot_loss,
            'params': {
                'history': history.history
            }
        },
        {
            'name': 'predictions',
            'title': 'Model Predictions',
            'function': self.visualizer.plot_predictions,
            'params': {
                'original_prices': original_prices,
                'train_pred': train_pred,
                'test_pred': test_pred,
                'train_size': len(X_train) + self.config.lookback,
                'lookback': self.config.lookback,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std
            }
        },
        {
            'name': 'residuals',
            'title': 'Residual Analysis',
            'function': self.visualizer.plot_residuals,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std
            }
        },
        {
            'name': 'error_distribution',
            'title': 'Error Distribution',
            'function': self.visualizer.plot_error_distribution,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std
            }
        },
        {
            'name': 'qq_plot',
            'title': 'Q-Q Plot',
            'function': self.visualizer.plot_qq,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std
            }
        },
        {
            'name': 'prediction_scatter',
            'title': 'Actual vs Predicted',
            'function': self.visualizer.plot_prediction_scatter,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std
            }
        },
        {
            'name': 'rolling_metrics',
            'title': 'Rolling Performance Metrics',
            'function': self.visualizer.plot_rolling_metrics,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'mean': self.data_processor.mean[-1] if hasattr(self.data_processor.mean, '__len__') else self.data_processor.mean,
                'std': self.data_processor.std[-1] if hasattr(self.data_processor.std, '__len__') else self.data_processor.std,
                'window': 20
            }
        },
        {
            'name': 'candlestick',
            'title': 'Price Action',
            'function': self.visualizer.plot_candlestick,
            'params': {
                'df': self.data_processor.df,
                'last_n_days': 30
            }
        },
        {
            'name': 'bollinger_bands',
            'title': 'Bollinger Bands Analysis',
            'function': self.visualizer.plot_bollinger_bands,
            'params': {
                'prices': original_prices,
                'window': 20
            }
        },
        {
            'name': 'momentum',
            'title': 'Momentum Indicators',
            'function': self.visualizer.plot_momentum_indicators,
            'params': {
                'prices': original_prices,
                'window': 14
            }
        },
        {
            'name': 'volume_profile',
            'title': 'Volume Profile Analysis',
            'function': self.visualizer.plot_volume_profile,
            'params': {
                'df': self.data_processor.df,
                'n_bins': 50
            }
        },
        {
            'name': 'drawdown',
            'title': 'Drawdown Analysis',
            'function': self.visualizer.plot_drawdown,
            'params': {
                'prices': original_prices
            }
        },
        {
            'name': 'error_vs_volatility',
            'title': 'Prediction Error vs Volatility',
            'function': self.visualizer.plot_prediction_error_by_volatility,
            'params': {
                'y_true': y_test,
                'y_pred': test_pred,
                'prices': original_prices,
                'window': 20
            }
        }
    ]

            # Generate each plot with progress updates
            total_plots = len(visualization_tasks)
            current_plot = 0

            for task in visualization_tasks:
                current_plot += 1
                progress = (current_plot / total_plots) * 100
                
                # Send plot start update
                self.websocket_manager.emit_stage(session_id, "visualizing_update", {
                    'current_plot': task['name'],
                    'plot_title': task['title'],
                    'total_plots': total_plots,
                    'progress': progress,
                    'status': 'processing',
                    'message': f'Generating {task["title"]} visualization'
                })
                
                # Simulate processing time
                self.websocket_manager.socketio.sleep(1.5)
                
                # Generate plot
                try:
                    plot = task['function'](**task['params'])
                    plots[task['name']] = plot
                    
                    # Send plot complete update
                    self.websocket_manager.emit_stage(session_id, "visualizing_update", {
                        'current_plot': task['name'],
                        'plot_title': task['title'],
                        'total_plots': total_plots,
                        'progress': progress,
                        'status': 'completed',
                        'duration': 1.5,
                        'preview': plot[:100] + '...'  # Truncated base64
                    })
                    
                except Exception as e:
                    # Handle errors gracefully
                    self.logger.warning("plot_generation_failed", 
                                    plot_name=task['name'],
                                    error=str(e))
                    
                    # Send error update to client
                    self.websocket_manager.emit_stage(session_id, "visualizing_update", {
                        'current_plot': task['name'],
                        'plot_title': task['title'],
                        'total_plots': total_plots,
                        'progress': progress,
                        'status': 'failed',
                        'error': str(e)
                    })

            # Final completion update
            self.websocket_manager.emit_stage(session_id, "visualizing_update", {
                'current_plot': 'all',
                'total_plots': total_plots,
                'progress': 100,
                'status': 'completed',
                'plots_generated': list(plots.keys()),
                'plots': plots
            })

            training_duration = (datetime.now() - training_start_time).total_seconds()
            self.logger.info("training_completed", 
                           ticker=ticker_symbol,
                           duration=training_duration,
                           train_metrics=train_metrics,
                           test_metrics=test_metrics)

            # After successful training, save the model and processor state
            self._save_state()
            
            # After training completes
            self.websocket_manager.socketio.sleep(2)  # Pause before evaluation

            # After evaluation completes
            self.websocket_manager.socketio.sleep(2)  # Pause before visualization

            return {
                'train_metrics': train_metrics,
                'test_metrics': test_metrics,
                'plots': plots,
                'history': {
                    'loss': [float(x) for x in history.history['loss']],
                    'val_loss': [float(x) for x in history.history['val_loss']]
                },
                'training_duration': training_duration
            }

        except Exception as e:
            self.logger.error("training_failed", 
                            ticker=ticker_symbol,
                            error=str(e),
                            exc_info=True)
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
                state['num_features'] = int(len(self.data_processor.df.columns))
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


