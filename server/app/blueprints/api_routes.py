from datetime import datetime, timedelta
from flask import request, current_app
from flask_restful import Resource, Api
from marshmallow import ValidationError
from sqlalchemy import text
import structlog
from flasgger import swag_from

from app.blueprints import api_bp
from app.models import Prediction, TrainingSession, ModelConfiguration
from app.models.training import TrainingStatus
from app.schemas import (
    PredictionRequestSchema, 
    TrainingRequestSchema,
    PredictionResponseSchema,
    TrainingResponseSchema
)
from app.services.prediction_service import PredictionService
from app.services.training_service import TrainingService
from app.utils.helpers import generate_request_id
from app.utils.logger import get_logger
from app.utils.exceptions import (
    ValidationError as CustomValidationError,
    TrainingError,
    PredictionError,
    ModelNotFoundError,
    DatabaseError
)
from app.middleware import rate_limit
from app import db, socketio

api = Api(api_bp)
logger = get_logger(__name__)


class HealthCheckResource(Resource):
    @rate_limit('default')
    @swag_from({
        'tags': ['System'],
        'summary': 'Get API health status',
        'description': 'Check the health status of all API services including database and training service',
        'responses': {
            200: {
                'description': 'API health status',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'status': {
                            'type': 'string', 
                            'example': 'healthy',
                            'enum': ['healthy', 'degraded', 'unhealthy'],
                            'description': 'Overall system health status'
                        },
                        'timestamp': {
                            'type': 'string', 
                            'example': '2024-01-15T10:30:00Z',
                            'description': 'ISO timestamp of the health check'
                        },
                        'version': {
                            'type': 'string', 
                            'example': '1.0.0',
                            'description': 'API version'
                        },
                        'services': {
                            'type': 'object',
                            'properties': {
                                'database': {
                                    'type': 'string', 
                                    'example': 'healthy',
                                    'enum': ['healthy', 'unhealthy'],
                                    'description': 'Database connection status'
                                },
                                'training_service': {
                                    'type': 'string', 
                                    'example': 'healthy',
                                    'enum': ['healthy', 'unhealthy'],
                                    'description': 'Training service status'
                                }
                            }
                        },
                        'uptime': {
                            'type': 'string', 
                            'example': '2 days, 5 hours, 30 minutes',
                            'description': 'System uptime'
                        }
                    }
                },
                'example': {
                    'status': 'healthy',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'version': '1.0.0',
                    'services': {
                        'database': 'healthy',
                        'training_service': 'healthy'
                    },
                    'uptime': '2 days, 5 hours, 30 minutes'
                }
            },
            503: {
                'description': 'Service degraded or unhealthy',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'status': {
                            'type': 'string', 
                            'example': 'degraded',
                            'enum': ['degraded', 'unhealthy']
                        },
                        'timestamp': {
                            'type': 'string', 
                            'example': '2024-01-15T10:30:00Z'
                        },
                        'version': {
                            'type': 'string', 
                            'example': '1.0.0'
                        },
                        'services': {
                            'type': 'object',
                            'properties': {
                                'database': {
                                    'type': 'string', 
                                    'example': 'unhealthy'
                                },
                                'training_service': {
                                    'type': 'string', 
                                    'example': 'healthy'
                                }
                            }
                        },
                        'uptime': {
                            'type': 'string', 
                            'example': '2 days, 5 hours, 30 minutes'
                        }
                    }
                },
                'example': {
                    'status': 'degraded',
                    'timestamp': '2024-01-15T10:30:00Z',
                    'version': '1.0.0',
                    'services': {
                        'database': 'unhealthy',
                        'training_service': 'healthy'
                    },
                    'uptime': '2 days, 5 hours, 30 minutes'
                }
            }
        }
    })
    def get(self):
        """Get API health status."""
        try:
            # Check database connection
            db.session.execute(text('SELECT 1'))
            db_status = 'healthy'
        except Exception as e:
            logger.error("database_health_check_failed", error=str(e))
            db_status = 'unhealthy'
        
        # Check training service
        try:
            training_service = TrainingService()
            training_status = 'healthy'
        except Exception as e:
            logger.error("training_service_health_check_failed", error=str(e))
            training_status = 'unhealthy'
        
        overall_status = 'healthy' if all([db_status == 'healthy', training_status == 'healthy']) else 'degraded'
        
        return {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'services': {
                'database': db_status,
                'training_service': training_status
            },
            'uptime': 'running'  # In production, calculate actual uptime
        }, 200 if overall_status == 'healthy' else 503


class PredictionResource(Resource):
    """Prediction endpoint for crypto price predictions."""
    
    def __init__(self):
        self.prediction_service = PredictionService()
        self.schema = PredictionRequestSchema()
        self.response_schema = PredictionResponseSchema()
    
    @rate_limit('prediction')
    @swag_from({
        'tags': ['Predictions'],
        'summary': 'Make a crypto price prediction',
        'description': 'Generate price predictions for cryptocurrencies using trained machine learning models',
        'parameters': [
            {
                'name': 'body',
                'in': 'body',
                'required': True,
                'schema': {
                    'type': 'object',
                    'properties': {
                        'ticker': {
                            'type': 'string', 
                            'example': 'BTC-USD',
                            'description': 'Cryptocurrency ticker symbol (e.g., BTC-USD, ETH-USD, SOL-USD)',
                            'maxLength': 20
                        },
                        'start_date': {
                            'type': 'string', 
                            'example': '2024-01-01',
                            'description': 'Start date for prediction (YYYY-MM-DD format)',
                            'format': 'date'
                        },
                        'days': {
                            'type': 'integer', 
                            'example': 7,
                            'minimum': 1,
                            'maximum': 30,
                            'description': 'Number of days to predict (1-30 days)'
                        }
                    },
                    'required': ['ticker', 'start_date', 'days'],
                    'example': {
                        'ticker': 'BTC-USD',
                        'start_date': '2024-01-01',
                        'days': 7
                    }
                }
            }
        ],
        'responses': {
            200: {
                'description': 'Prediction successful',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'request_id': {'type': 'string', 'example': 'pred_1234567890'},
                        'status': {'type': 'string', 'example': 'success'},
                        'data': {
                            'type': 'object',
                            'properties': {
                                'ticker': {'type': 'string', 'example': 'BTC-USD'},
                                'predictions': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'object',
                                        'properties': {
                                            'date': {'type': 'string', 'example': '2024-01-02'},
                                            'predicted_price': {'type': 'number', 'example': 45000.50},
                                            'confidence_score': {'type': 'number', 'example': 0.85}
                                        }
                                    }
                                }
                            }
                        },
                        'timestamp': {'type': 'string', 'example': '2024-01-15T10:30:00Z'}
                    }
                },
                'example': {
                    'request_id': 'pred_1234567890',
                    'status': 'success',
                    'data': {
                        'ticker': 'BTC-USD',
                        'predictions': [
                            {
                                'date': '2024-01-02',
                                'predicted_price': 45000.50,
                                'confidence_score': 0.85
                            },
                            {
                                'date': '2024-01-03',
                                'predicted_price': 45200.75,
                                'confidence_score': 0.82
                            }
                        ]
                    },
                    'timestamp': '2024-01-15T10:30:00Z'
                }
            },
            400: {
                'description': 'Validation error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Validation failed'},
                        'error_code': {'type': 'string', 'example': 'VALIDATION_ERROR'},
                        'details': {
                            'type': 'object',
                            'example': {
                                'start_date': ['Missing data for required field.'],
                                'days': ['Missing data for required field.']
                            }
                        }
                    }
                }
            },
            500: {
                'description': 'Internal server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Internal server error'},
                        'error_code': {'type': 'string', 'example': 'INTERNAL_ERROR'},
                        'message': {'type': 'string', 'example': 'An unexpected error occurred'}
                    }
                }
            }
        }
    })
    def post(self):
        """Create a new prediction."""
        request_id = generate_request_id()
        
        try:
            # Validate request data
            try:
                data = self.schema.load(request.get_json())
            except ValidationError as e:
                logger.warning("prediction_validation_failed", 
                              request_id=request_id, 
                              errors=e.messages)
                return {
                    'error': 'Validation failed',
                    'error_code': 'VALIDATION_ERROR',
                    'details': e.messages
                }, 400
            
            # Validate business rules
            if data['days'] > current_app.config.get('MAX_PREDICTION_DAYS', 30):
                return {
                    'error': 'Prediction days exceed maximum allowed',
                    'error_code': 'VALIDATION_ERROR',
                    'details': {
                        'max_days': current_app.config.get('MAX_PREDICTION_DAYS', 30),
                        'requested_days': data['days']
                    }
                }, 400
            
            # Make prediction
            prediction_result = self.prediction_service.make_prediction(
                ticker=data['ticker'],
                start_date=data['start_date'],
                days=data['days'],
                request_id=request_id
            )
            
            if not prediction_result['success']:
                raise PredictionError(
                    message=prediction_result['error'],
                    ticker=data['ticker'],
                    model_type='LSTM'  # Default model type
                )
            
            # Store prediction in database
            self._store_prediction(prediction_result['data'], request_id)
            
            # Prepare response
            response_data = self.response_schema.dump({
                'request_id': request_id,
                'status': 'success',
                'data': prediction_result['data']
            })
            
            logger.info("prediction_successful", 
                       request_id=request_id,
                       ticker=data['ticker'],
                       predictions_count=len(prediction_result['data']['predictions']))
            
            return response_data, 200
            
        except CustomValidationError as e:
            return e.to_dict(), 400
        except PredictionError as e:
            return e.to_dict(), 400
        except Exception as e:
            logger.error("prediction_error", 
                        request_id=request_id,
                        error=str(e),
                        exc_info=True)
            return {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred while processing your prediction'
            }, 500
    
    def _store_prediction(self, prediction_data: dict, request_id: str) -> None:
        """Store prediction results in database."""
        try:
            from datetime import datetime
            
            for pred in prediction_data['predictions']:
                # Convert date string to date object
                prediction_date = datetime.fromisoformat(pred['date']).date()
                
                prediction = Prediction(
                    request_id=request_id,
                    ticker=prediction_data['ticker'],
                    model_type=prediction_data['model_config']['model_type'],
                    prediction_date=prediction_date,
                    predicted_price=pred['price'],
                    confidence_score=pred.get('confidence')
                )
                db.session.add(prediction)
            
            db.session.commit()
            logger.info("prediction_stored", request_id=request_id)
            
        except Exception as e:
            logger.error("prediction_storage_failed", 
                        request_id=request_id,
                        error=str(e))
            db.session.rollback()
            raise DatabaseError(
                message="Failed to store prediction results",
                operation="insert",
                table="predictions"
            )


class TrainingResource(Resource):
    """Training endpoint for model training."""
    
    def __init__(self):
        self.training_service = TrainingService()
        self.schema = TrainingRequestSchema()
        self.response_schema = TrainingResponseSchema()
    
    @rate_limit('training')
    @swag_from({
        'tags': ['Training'],
        'summary': 'Start model training',
        'description': 'Start training a new machine learning model for cryptocurrency price prediction',
        'parameters': [
            {
                'name': 'body',
                'in': 'body',
                'required': True,
                'schema': {
                    'type': 'object',
                    'properties': {
                        'ticker': {
                            'type': 'string', 
                            'example': 'BTC-USD',
                            'description': 'Cryptocurrency ticker symbol (e.g., BTC-USD, ETH-USD, SOL-USD, ADA-USD)',
                            'maxLength': 20
                        },
                        'model_type': {
                            'type': 'string', 
                            'example': 'LSTM',
                            'enum': ['LSTM', 'CNN', 'CNN-LSTM', 'LSTM-CNN'],
                            'description': 'Type of machine learning model to use'
                        },
                        'start_date': {
                            'type': 'string', 
                            'example': '2023-01-01',
                            'description': 'Start date for training data (YYYY-MM-DD format)',
                            'format': 'date'
                        },
                        'end_date': {
                            'type': 'string', 
                            'example': '2024-01-01',
                            'description': 'End date for training data (YYYY-MM-DD format)',
                            'format': 'date'
                        },
                        'lookback': {
                            'type': 'integer', 
                            'example': 30,
                            'minimum': 10,
                            'maximum': 365,
                            'description': 'Number of days to look back for training (10-365 days)'
                        },
                        'epochs': {
                            'type': 'integer', 
                            'example': 100,
                            'minimum': 1,
                            'maximum': 1000,
                            'description': 'Number of training epochs (1-1000)'
                        },
                        'batch_size': {
                            'type': 'integer', 
                            'example': 32,
                            'minimum': 8,
                            'maximum': 256,
                            'description': 'Training batch size (8-256, optional)'
                        },
                        'learning_rate': {
                            'type': 'number', 
                            'example': 0.001,
                            'minimum': 0.0001,
                            'maximum': 0.1,
                            'description': 'Learning rate for training (0.0001-0.1, optional)'
                        }
                    },
                    'required': ['ticker', 'model_type', 'start_date', 'end_date', 'lookback', 'epochs'],
                    'example': {
                        'ticker': 'BTC-USD',
                        'model_type': 'LSTM',
                        'start_date': '2023-01-01',
                        'end_date': '2024-01-01',
                        'lookback': 30,
                        'epochs': 100,
                        'batch_size': 32,
                        'learning_rate': 0.001
                    }
                }
            }
        ],
        'responses': {
            202: {
                'description': 'Training started successfully',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'request_id': {'type': 'string', 'example': 'train_1234567890'},
                        'session_id': {'type': 'string', 'example': 'train_1234567890'},
                        'status': {'type': 'string', 'example': 'training_started'},
                        'message': {'type': 'string', 'example': 'Training started successfully'}
                    }
                },
                'example': {
                    'request_id': 'train_1234567890',
                    'session_id': 'train_1234567890',
                    'status': 'training_started',
                    'message': 'Training started successfully'
                }
            },
            400: {
                'description': 'Validation error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Validation failed'},
                        'error_code': {'type': 'string', 'example': 'VALIDATION_ERROR'},
                        'details': {
                            'type': 'object',
                            'example': {
                                'start_date': ['Missing data for required field.'],
                                'end_date': ['Missing data for required field.'],
                                'lookback': ['Missing data for required field.']
                            }
                        }
                    }
                }
            },
            429: {
                'description': 'Too many training sessions',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Maximum training sessions reached'},
                        'error_code': {'type': 'string', 'example': 'RESOURCE_LIMIT_EXCEEDED'},
                        'details': {
                            'type': 'object',
                            'properties': {
                                'max_sessions': {'type': 'integer', 'example': 10},
                                'active_sessions': {'type': 'integer', 'example': 10}
                            }
                        }
                    }
                }
            },
            500: {
                'description': 'Internal server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Internal server error'},
                        'error_code': {'type': 'string', 'example': 'INTERNAL_ERROR'},
                        'message': {'type': 'string', 'example': 'An unexpected error occurred while starting training'}
                    }
                }
            }
        }
    })
    def post(self):
        """Start a new training session."""
        request_id = generate_request_id()
        
        logger.info("=== TRAINING REQUEST START ===", request_id=request_id)
        
        try:
            # Log incoming request
            request_data = request.get_json()
            logger.info("training_request_received", 
                       request_id=request_id, 
                       data=request_data)
            
            # Validate request data
            try:
                data = self.schema.load(request_data)
                logger.info("training_validation_success", 
                           request_id=request_id, 
                           validated_data=data)
            except ValidationError as e:
                logger.warning("training_validation_failed", 
                              request_id=request_id, 
                              errors=e.messages)
                return {
                    'error': 'Validation failed',
                    'error_code': 'VALIDATION_ERROR',
                    'details': e.messages
                }, 400
            
            # Validate business rules
            if data['epochs'] > current_app.config.get('MAX_EPOCHS', 1000):
                logger.warning("training_epochs_exceeded", 
                              request_id=request_id, 
                              requested_epochs=data['epochs'],
                              max_epochs=current_app.config.get('MAX_EPOCHS', 1000))
                return {
                    'error': 'Epochs exceed maximum allowed',
                    'error_code': 'VALIDATION_ERROR',
                    'details': {
                        'max_epochs': current_app.config.get('MAX_EPOCHS', 1000),
                        'requested_epochs': data['epochs']
                    }
                }, 400
            
            # Check training session limits
            active_sessions = TrainingSession.query.filter_by(
                status=TrainingStatus.IN_PROGRESS
            ).count()
            
            max_sessions = current_app.config.get('MAX_TRAINING_SESSIONS', 10)
            logger.info("training_session_check", 
                       request_id=request_id,
                       active_sessions=active_sessions,
                       max_sessions=max_sessions)
            
            if active_sessions >= max_sessions:
                logger.warning("training_sessions_limit_exceeded", 
                              request_id=request_id,
                              active_sessions=active_sessions,
                              max_sessions=max_sessions)
                return {
                    'error': 'Maximum training sessions reached',
                    'error_code': 'RESOURCE_LIMIT_EXCEEDED',
                    'details': {
                        'max_sessions': max_sessions,
                        'active_sessions': active_sessions
                    }
                }, 429
            
            logger.info("creating_training_session", 
                       request_id=request_id, 
                       ticker=data['ticker'])
            
            # Create training session
            training_session = self._create_training_session(data, request_id)
            logger.info("training_session_created", 
                       request_id=request_id,
                       session_id=training_session.session_id)
            
            logger.info("calling_training_service", request_id=request_id)
            
            # Start training
            training_result = self.training_service.start_training(
                session_id=request_id,
                training_data=data,
                websocket_manager=socketio
            )
            
            logger.info("training_service_result", 
                       request_id=request_id, 
                       result=training_result)
            
            if not training_result['success']:
                logger.error("training_service_failed", 
                            request_id=request_id,
                            error=training_result['error'])
                raise TrainingError(
                    message=training_result['error'],
                    session_id=request_id,
                    stage='startup'
                )
            
            # Prepare response
            response_data = self.response_schema.dump({
                'request_id': request_id,
                'status': 'training_started',
                'session_id': request_id,
                'message': 'Training started successfully'
            })
            
            logger.info("training_started_successfully", 
                       request_id=request_id,
                       ticker=data['ticker'],
                       model_type=data['model_type'],
                       response=response_data)
            
            logger.info("=== TRAINING REQUEST SUCCESS ===", request_id=request_id)
            return response_data, 202
            
        except CustomValidationError as e:
            logger.error("training_custom_validation_error", 
                        request_id=request_id,
                        error=e.to_dict())
            return e.to_dict(), 400
        except TrainingError as e:
            logger.error("training_error", 
                        request_id=request_id,
                        error=e.to_dict())
            return e.to_dict(), 400
        except Exception as e:
            logger.error("training_unexpected_error", 
                        request_id=request_id,
                        error=str(e),
                        exc_info=True)
            return {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred while starting training'
            }, 500
        finally:
            logger.info("=== TRAINING REQUEST END ===", request_id=request_id)
    
    def _create_training_session(self, training_data: dict, session_id: str) -> TrainingSession:
        """Create a new training session with configuration."""
        try:
            from datetime import datetime
            
            # Always create a new configuration with unique hash using session_id
            import time
            unique_suffix = str(int(time.time() * 1000000))[-6:]  # Last 6 digits of microseconds
            
            # Generate base hash and add unique suffix
            base_hash = ModelConfiguration.generate_hash(
                model_type=training_data['model_type'],
                ticker=training_data['ticker'],
                lookback_days=training_data['lookback'],
                epochs=training_data['epochs'],
                batch_size=training_data.get('batch_size', 32),
                learning_rate=training_data.get('learning_rate', 0.001)
            )
            config_hash = f"{base_hash}_{session_id}_{unique_suffix}"
            
            config = ModelConfiguration(
                config_hash=config_hash,
                model_type=training_data['model_type'],
                ticker=training_data['ticker'],
                lookback_days=training_data['lookback'],
                epochs=training_data['epochs'],
                batch_size=training_data.get('batch_size', 32),
                learning_rate=training_data.get('learning_rate', 0.001)
            )
            
            db.session.add(config)
            db.session.flush()
            logger.info("created_new_config", 
                       config_id=config.id, 
                       config_hash=config_hash)
            
            now = datetime.now()
            session = TrainingSession(
                session_id=session_id,
                ticker=training_data['ticker'],
                model_type=training_data['model_type'],
                start_date=training_data['start_date'],
                end_date=training_data['end_date'],
                lookback_days=training_data['lookback'],
                epochs=training_data['epochs'],
                model_config_id=config.id,
                status=TrainingStatus.PENDING,
                started_at=now,
                created_at=now,
                updated_at=now
            )
            
            db.session.add(session)
            db.session.commit()
            
            logger.info("training_session_created", 
                       session_id=session_id,
                       config_id=config.id)
            
            return session
            
        except Exception as e:
            logger.error("training_session_creation_failed", 
                        session_id=session_id,
                        error=str(e))
            db.session.rollback()
            raise DatabaseError(
                message="Failed to create training session",
                operation="insert",
                table="training_sessions"
            )


class TrainingStatusResource(Resource):
    """Training status endpoint."""
    
    def __init__(self):
        self.training_service = TrainingService()
    
    @rate_limit('default')
    @swag_from({
        'tags': ['Training'],
        'summary': 'Get training status',
        'description': 'Get the current status and progress of a training session',
        'parameters': [
            {
                'name': 'session_id',
                'in': 'path',
                'type': 'string',
                'required': True,
                'description': 'Training session ID (e.g., train_1234567890)',
                'example': 'train_1234567890'
            }
        ],
        'responses': {
            200: {
                'description': 'Training status retrieved successfully',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'session_id': {'type': 'string', 'example': 'train_1234567890'},
                        'ticker': {'type': 'string', 'example': 'BTC-USD'},
                        'model_type': {'type': 'string', 'example': 'LSTM'},
                        'status': {'type': 'string', 'example': 'IN_PROGRESS'},
                        'progress': {'type': 'number', 'example': 75.5},
                        'current_epoch': {'type': 'integer', 'example': 75},
                        'total_epochs': {'type': 'integer', 'example': 100},
                        'accuracy': {'type': 'number', 'example': 0.85},
                        'loss': {'type': 'number', 'example': 0.15},
                        'message': {'type': 'string', 'example': 'Training in progress - Epoch 75/100'},
                        'started_at': {'type': 'string', 'example': '2024-01-15T10:30:00'},
                        'estimated_completion': {'type': 'string', 'example': '2024-01-15T11:45:00'}
                    }
                },
                'example': {
                    'session_id': 'train_1234567890',
                    'ticker': 'BTC-USD',
                    'model_type': 'LSTM',
                    'status': 'IN_PROGRESS',
                    'progress': 75.5,
                    'current_epoch': 75,
                    'total_epochs': 100,
                    'accuracy': 0.85,
                    'loss': 0.15,
                    'message': 'Training in progress - Epoch 75/100',
                    'started_at': '2024-01-15T10:30:00',
                    'estimated_completion': '2024-01-15T11:45:00'
                }
            },
            404: {
                'description': 'Training session not found',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Training session not found'},
                        'error_code': {'type': 'string', 'example': 'NOT_FOUND'},
                        'details': {
                            'type': 'object',
                            'properties': {
                                'session_id': {'type': 'string', 'example': 'train_1234567890'},
                                'message': {'type': 'string', 'example': 'The specified training session was not found'}
                            }
                        }
                    }
                }
            },
            500: {
                'description': 'Internal server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Internal server error'},
                        'error_code': {'type': 'string', 'example': 'INTERNAL_ERROR'},
                        'message': {'type': 'string', 'example': 'Failed to retrieve training status'}
                    }
                }
            }
        }
    })
    def get(self, session_id):
        """Get training session status."""
        try:
            status = self.training_service.get_training_status(session_id)
            if status:
                return status, 200
            else:
                return {
                    'error': 'Training session not found',
                    'error_code': 'NOT_FOUND',
                    'details': {
                        'session_id': session_id,
                        'message': 'The specified training session was not found'
                    }
                }, 404
                
        except Exception as e:
            logger.error("training_status_error", 
                        session_id=session_id,
                        error=str(e),
                        exc_info=True)
            return {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'message': 'Failed to retrieve training status'
            }, 500


class TrainingCancelResource(Resource):
    """Training cancellation endpoint."""
    
    def __init__(self):
        self.training_service = TrainingService()
    
    @rate_limit('training')
    @swag_from({
        'tags': ['Training'],
        'summary': 'Cancel training session',
        'description': 'Cancel an ongoing training session',
        'parameters': [
            {
                'name': 'session_id',
                'in': 'path',
                'type': 'string',
                'required': True,
                'description': 'Training session ID to cancel (e.g., train_1234567890)',
                'example': 'train_1234567890'
            }
        ],
        'responses': {
            200: {
                'description': 'Training cancelled successfully',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'success': {'type': 'boolean', 'example': True},
                        'message': {'type': 'string', 'example': 'Training session cancelled successfully'},
                        'session_id': {'type': 'string', 'example': 'train_1234567890'},
                        'cancelled_at': {'type': 'string', 'example': '2024-01-15T10:30:00'}
                    }
                },
                'example': {
                    'success': True,
                    'message': 'Training session cancelled successfully',
                    'session_id': 'train_1234567890',
                    'cancelled_at': '2024-01-15T10:30:00'
                }
            },
            400: {
                'description': 'Cancellation failed',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Training session cannot be cancelled'},
                        'error_code': {'type': 'string', 'example': 'CANCELLATION_FAILED'},
                        'details': {
                            'type': 'object',
                            'properties': {
                                'session_id': {'type': 'string', 'example': 'train_1234567890'},
                                'message': {'type': 'string', 'example': 'Training session is already completed'}
                            }
                        }
                    }
                }
            },
            404: {
                'description': 'Training session not found',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Training session not found'},
                        'error_code': {'type': 'string', 'example': 'NOT_FOUND'},
                        'details': {
                            'type': 'object',
                            'properties': {
                                'session_id': {'type': 'string', 'example': 'train_1234567890'},
                                'message': {'type': 'string', 'example': 'The specified training session was not found'}
                            }
                        }
                    }
                }
            },
            500: {
                'description': 'Internal server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Internal server error'},
                        'error_code': {'type': 'string', 'example': 'INTERNAL_ERROR'},
                        'message': {'type': 'string', 'example': 'Failed to cancel training session'}
                    }
                }
            }
        }
    })
    def post(self, session_id):
        """Cancel a training session."""
        try:
            result = self.training_service.cancel_training(session_id)
            if result['success']:
                return result, 200
            else:
                return {
                    'error': result['error'],
                    'error_code': 'CANCELLATION_FAILED',
                    'details': {
                        'session_id': session_id,
                        'message': result['error']
                    }
                }, 400
                
        except Exception as e:
            logger.error("training_cancel_error", 
                        session_id=session_id,
                        error=str(e),
                        exc_info=True)
            return {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'message': 'Failed to cancel training session'
            }, 500


class RunningTrainingsResource(Resource):
    """Running trainings endpoint."""
    
    def __init__(self):
        self.training_service = TrainingService()
    
    @rate_limit('default')
    @swag_from({
        'tags': ['Training'],
        'summary': 'Get running trainings',
        'description': 'Get information about all currently running training sessions',
        'responses': {
            200: {
                'description': 'Running trainings retrieved successfully',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'running_trainings': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'session_id': {'type': 'string', 'example': 'train_1234567890'},
                                    'ticker': {'type': 'string', 'example': 'BTC-USD'},
                                    'model_type': {'type': 'string', 'example': 'LSTM'},
                                    'status': {'type': 'string', 'example': 'IN_PROGRESS'},
                                    'progress': {'type': 'number', 'example': 75.5},
                                    'current_epoch': {'type': 'integer', 'example': 75},
                                    'total_epochs': {'type': 'integer', 'example': 100},
                                    'started_at': {'type': 'string', 'example': '2024-01-15T10:30:00'},
                                    'estimated_completion': {'type': 'string', 'example': '2024-01-15T11:45:00'}
                                }
                            }
                        },
                        'count': {'type': 'integer', 'example': 3},
                        'max_sessions': {'type': 'integer', 'example': 10}
                    }
                },
                'example': {
                    'running_trainings': [
                        {
                            'session_id': 'train_1234567890',
                            'ticker': 'BTC-USD',
                            'model_type': 'LSTM',
                            'status': 'IN_PROGRESS',
                            'progress': 75.5,
                            'current_epoch': 75,
                            'total_epochs': 100,
                            'started_at': '2024-01-15T10:30:00',
                            'estimated_completion': '2024-01-15T11:45:00'
                        },
                        {
                            'session_id': 'train_9876543210',
                            'ticker': 'ETH-USD',
                            'model_type': 'CNN',
                            'status': 'IN_PROGRESS',
                            'progress': 45.2,
                            'current_epoch': 45,
                            'total_epochs': 100,
                            'started_at': '2024-01-15T09:15:00',
                            'estimated_completion': '2024-01-15T12:30:00'
                        }
                    ],
                    'count': 2,
                    'max_sessions': 10
                }
            },
            500: {
                'description': 'Internal server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {'type': 'string', 'example': 'Internal server error'},
                        'error_code': {'type': 'string', 'example': 'INTERNAL_ERROR'},
                        'message': {'type': 'string', 'example': 'Failed to retrieve running trainings'}
                    }
                }
            }
        }
    })
    def get(self):
        """Get information about currently running training sessions."""
        try:
            running_trainings = self.training_service.get_running_trainings()
            return {
                'running_trainings': running_trainings,
                'count': len(running_trainings),
                'max_sessions': current_app.config.get('MAX_TRAINING_SESSIONS', 10)
            }, 200
                
        except Exception as e:
            logger.error("running_trainings_error", 
                        error=str(e),
                        exc_info=True)
            return {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'message': 'Failed to retrieve running trainings'
            }, 500


# Register resources
api.add_resource(HealthCheckResource, '/health')
api.add_resource(PredictionResource, '/predict')
api.add_resource(TrainingResource, '/train')
api.add_resource(TrainingStatusResource, '/train/<string:session_id>/status')
api.add_resource(TrainingCancelResource, '/train/<string:session_id>/cancel')
api.add_resource(RunningTrainingsResource, '/train/running')

