"""Prediction service for handling crypto price predictions."""

from datetime import datetime, timedelta, date
from typing import Dict, Any

from app.utils.logger import get_logger
from app import socketio

logger = get_logger(__name__)


class PredictionService:
    def __init__(self):
        pass

    def make_prediction(self, **kwargs) -> Dict[str, Any]:
        # RORO pattern: Extract parameters
        ticker = kwargs.get('ticker')
        start_date = kwargs.get('start_date')
        days = kwargs.get('days')
        request_id = kwargs.get('request_id')

        if not all([ticker, start_date, days, request_id]):
            return {
                'success': False,
                'error': 'Missing required parameters: ticker, start_date, days, request_id'
            }

        try:
            # Parse start_date to date
            if isinstance(start_date, str):
                start_date_obj = datetime.fromisoformat(start_date).date()
            elif isinstance(start_date, datetime):
                start_date_obj = start_date.date()
            elif isinstance(start_date, date):
                start_date_obj = start_date
            else:
                raise ValueError('Invalid start_date format')

            # Lazy import heavy ML deps to avoid startup import errors in non-ML contexts
            import numpy as np  # type: ignore
            from ml_app.websocket.manager import WebSocketManager  # type: ignore
            from ml_app.predictor import CryptoPredictor  # type: ignore

            # Load latest trained model and preprocessing stats
            ws_manager = WebSocketManager(socketio)
            predictor = CryptoPredictor.load_latest(ws_manager)
            if predictor is None:
                return {
                    'success': False,
                    'error': 'No trained model found. Please train a model before predicting.'
                }

            lookback = predictor.config.lookback

            # Fetch a window of recent data up to start_date
            # Use a larger span to ensure enough trading days
            fetch_start = (start_date_obj - timedelta(days=lookback * 4)).isoformat()
            fetch_end = start_date_obj.isoformat()

            # Reuse DataProcessor but DO NOT recompute mean/std; use saved ones
            df = predictor.data_processor.data_fetcher.fetch_historical_data(ticker, fetch_start, fetch_end)
            if df.empty:
                raise ValueError(f'No data available for {ticker} in the requested range')

            # Ensure required columns
            required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            if not all(col in df.columns for col in required_columns):
                raise ValueError('Fetched data missing required OHLCV columns')

            features = df[required_columns].values

            # Determine expected feature dimension from the loaded model
            try:
                expected_features = int(predictor.model.input_shape[-1])
            except Exception:
                expected_features = features.shape[1]

            # Normalize with saved mean/std and align feature dimension
            saved_mean = predictor.data_processor.mean
            saved_std = predictor.data_processor.std
            mean_arr = np.array(saved_mean)
            std_arr = np.array(saved_std)
            std_arr_safe = np.where(std_arr == 0, 1.0, std_arr)

            if expected_features == 1:
                # Use only Close as the target feature normalized with target stats
                close = df['Close'].values.reshape(-1, 1)
                if mean_arr.ndim > 0 and mean_arr.size > 1:
                    mean_target = float(mean_arr[-1])
                    std_target = float(std_arr_safe[-1])
                else:
                    mean_target = float(mean_arr)
                    std_target = float(std_arr_safe)
                normalized = (close - mean_target) / (std_target if std_target != 0 else 1.0)
            # Multi-feature path: align number of features if needed
            elif mean_arr.ndim == 0:
                normalized = (features - float(mean_arr)) / float(std_arr_safe)
            else:
                # If saved stats have more features than model expects, slice to match
                if mean_arr.size >= expected_features:
                    mean_use = mean_arr[:expected_features]
                    std_use = std_arr_safe[:expected_features]
                    feats_use = features[:, :expected_features]
                else:
                    # Fallback: use as many as available
                    mean_use = mean_arr
                    std_use = std_arr_safe
                    feats_use = features[:, :mean_arr.size]
                normalized = (feats_use - mean_use) / std_use

            if len(normalized) < lookback:
                raise ValueError(f'Insufficient data to form lookback window ({lookback})')

            initial_window = normalized[-lookback:]

            # Run multi-day predictions
            predictions_raw = predictor.predict_multiple_days(initial_window, int(days))

            # Map predictions to API shape
            predictions = []
            for i, p in enumerate(predictions_raw):
                pred_date = (start_date_obj + timedelta(days=i + 1)).isoformat()
                predictions.append({
                    'date': pred_date,
                    'predicted_price': p['predicted_price'],
                    'confidence_score': max(0.0, min(1.0, 1.0 - (p.get('volatility_factor', 1.0) - 1.0) * 0.3)),
                    'confidence_interval': p.get('confidence_interval'),
                    'lower_bound': p.get('lower_bound'),
                    'upper_bound': p.get('upper_bound')
                })

            response_data = {
                'ticker': ticker,
                'predictions': predictions,
                'model_config': {
                    'model_type': predictor.config.model,
                    'lookback_days': predictor.config.lookback,
                    'epochs': predictor.config.epochs
                },
                'data_range': {
                    'start_date': start_date_obj.isoformat(),
                    'end_date': fetch_end,
                    'prediction_start': (start_date_obj + timedelta(days=1)).isoformat()
                }
            }

            logger.info("prediction_generated",
                       request_id=request_id,
                       ticker=ticker,
                       predictions_count=len(predictions))

            return {
                'success': True,
                'data': response_data
            }

        except Exception as e:
            logger.error("prediction_failed",
                        request_id=request_id,
                        ticker=ticker,
                        error=str(e),
                        exc_info=True)
            return {
                'success': False,
                'error': f'Prediction failed: {e!s}'
            }
