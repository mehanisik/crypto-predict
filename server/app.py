from flask import Flask, jsonify, request
from flask_socketio import SocketIO
import structlog
from datetime import datetime, timedelta
import redis
from flask_cors import CORS
import os

from validations import TrainingRequest, PredictionRequest
from ml_app.config import ModelConfig
from ml_app.predictor import CryptoPredictor
from ml_app.websocket.manager import WebSocketManager
from utils.helpers import fetch_historical_data, make_predictions
from utils.logger import setup_logging, get_logger, RequestIdContext






app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": os.getenv('CORS_ORIGINS', '*'),
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
redis_client = redis.from_url(redis_url)

socketio = SocketIO(
    app,
    cors_allowed_origins=os.getenv('CORS_ORIGINS', '*'),
    message_queue=redis_url,
    async_mode='eventlet'
)

websocket_manager = WebSocketManager(socketio)

# Setup logging with environment-configured level
setup_logging(log_level=os.getenv("LOG_LEVEL", "INFO"))
logger = get_logger(__name__)


@app.route('/predict', methods=['POST'])
def predict_model():
    """
    Handles prediction requests.
    """
    request_id = datetime.now().strftime('%Y%m%d%H%M%S')
    
    with RequestIdContext(request_id) as log:
        try:
            log.info("received_prediction_request", data=request.json)

            # Validate input
            try:
                data = request.get_json()
                validated_data = PredictionRequest(**data)
            except Exception as e:
                log.warning("validation_failed", error=str(e))
                return jsonify({'error': 'Validation failed', 'message': str(e)}), 400

            # Load the latest trained model
            predictor = CryptoPredictor.load_latest(websocket_manager)
            if predictor is None:
                log.error("no_trained_model_found")
                return jsonify({'error': 'No trained model found'}), 404

            # Fetch historical data
            historical_data = fetch_historical_data(
                ticker=predictor.config.ticker,
                start_date=validated_data.start_date,
                lookback=predictor.config.lookback
            )
            if historical_data is None:
                return jsonify({
                    'error': 'No data available',
                    'message': f"No data found for {predictor.config.ticker}."
                }), 400

            # Make predictions
            try:
                predictions = make_predictions(predictor, historical_data, validated_data.days)
            except Exception as e:
                log.error("prediction_failed", error=str(e), exc_info=True)
                return jsonify({'error': 'Prediction failed', 'message': str(e)}), 500

            # Return successful response
            log.info("prediction_successful", 
                    predictions_count=len(predictions),
                    ticker=predictor.config.ticker)
            
            return jsonify({
                'request_id': request_id,
                'status': 'success',
                'data': {
                    'predictions': predictions,
                    'model_config': predictor.config.__dict__,
                    'data_range': {
                        'start_date': historical_data.index[0].isoformat(),
                        'end_date': historical_data.index[-1].isoformat(),
                        'prediction_start': (datetime.now().date() + timedelta(days=1)).isoformat()
                    }
                }
            })

        except Exception as e:
            log.error("unexpected_error", 
                     error=str(e), 
                     error_type=type(e).__name__, 
                     exc_info=True)
            return jsonify({
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            }), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/train', methods=['POST'])
def train_model():
    """Handles model training requests"""
    request_id = datetime.now().strftime('%Y%m%d%H%M%S')
    
    with RequestIdContext(request_id) as log:
        try:
            log.info("received_training_request", data=request.json)

            # Validate input
            try:
                data = request.get_json()
                validated_data = TrainingRequest(**data)
            except Exception as e:
                log.warning("validation_failed", error=str(e))
                return jsonify({'error': 'Validation failed', 'message': str(e)}), 400

            # Initialize model configuration
            config = ModelConfig(
                model=validated_data.model,
                lookback=validated_data.lookback,
                epochs=validated_data.epochs,
                ticker=validated_data.ticker
            )

            # Start training
            try:
                predictor = CryptoPredictor(config, websocket_manager)
                result = predictor.train(
                    validated_data.ticker,
                    validated_data.start_date.isoformat(),
                    validated_data.end_date.isoformat()
                )
                
                log.info("training_successful", ticker=validated_data.ticker)
                return jsonify({
                    'request_id': request_id,
                    'status': 'success',
                    'data': result
                })
                
            except Exception as e:
                log.error("training_error", error=str(e), exc_info=True)
                return jsonify({'error': 'Training failed', 'message': str(e)}), 500

        except Exception as e:
            log.error("unexpected_error", 
                     error=str(e), 
                     error_type=type(e).__name__, 
                     exc_info=True)
            return jsonify({
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            }), 500


@app.errorhandler(Exception)
def handle_error(error):
    logger.error("unexpected_error", 
                error=str(error),
                error_type=type(error).__name__,
                exc_info=True)
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', os.getenv('CORS_ORIGINS', '*'))
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    logger.info("starting_server")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)