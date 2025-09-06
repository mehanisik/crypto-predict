"""Error handlers for the crypto prediction API."""

from flask import jsonify, current_app, request
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from marshmallow import ValidationError
from app.utils.exceptions import CryptoPredictionError
from app.utils.logger import get_logger

logger = get_logger(__name__)


def register_error_handlers(app):
    """Register all error handlers for the application."""

    @app.errorhandler(CryptoPredictionError)
    def handle_crypto_prediction_error(error):
        """Handle custom crypto prediction errors."""
        logger.error("crypto_prediction_error",
                    error_code=error.error_code,
                    message=error.message,
                    details=error.details,
                    path=request.path,
                    method=request.method)

        response = {
            'error': error.message,
            'error_code': error.error_code,
            'details': error.details,
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 400

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        """Handle validation errors."""
        logger.warning("validation_error",
                      field_errors=error.messages,
                      path=request.path,
                      method=request.method)

        response = {
            'error': 'Validation failed',
            'error_code': 'VALIDATION_ERROR',
            'details': {
                'field_errors': error.messages
            },
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 400

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """Handle database errors."""
        logger.error("database_error",
                    error=str(error),
                    path=request.path,
                    method=request.method,
                    exc_info=True)

        response = {
            'error': 'Database operation failed',
            'error_code': 'DATABASE_ERROR',
            'details': {
                'message': 'An internal database error occurred'
            },
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 500

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        """Handle HTTP errors."""
        logger.warning("http_error",
                      status_code=error.code,
                      description=error.description,
                      path=request.path,
                      method=request.method)

        response = {
            'error': error.description,
            'error_code': f'HTTP_{error.code}',
            'status_code': error.code,
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), error.code

    @app.errorhandler(Exception)
    def handle_generic_error(error):
        """Handle all other errors."""
        logger.error("unexpected_error",
                    error=str(error),
                    path=request.path,
                    method=request.method,
                    exc_info=True)

        # In production, don't expose internal errors
        if current_app.config.get('DEBUG', False):
            response = {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'details': {
                    'message': str(error),
                    'type': type(error).__name__
                },
                'path': request.path,
                'method': request.method
            }
        else:
            response = {
                'error': 'Internal server error',
                'error_code': 'INTERNAL_ERROR',
                'details': {
                    'message': 'An unexpected error occurred'
                },
                'path': request.path,
                'method': request.method
            }

        return jsonify(response), 500

    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors."""
        logger.warning("not_found",
                      path=request.path,
                      method=request.method)

        response = {
            'error': 'Resource not found',
            'error_code': 'NOT_FOUND',
            'details': {
                'message': f'The requested resource {request.path} was not found'
            },
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors."""
        logger.warning("method_not_allowed",
                      path=request.path,
                      method=request.method)

        response = {
            'error': 'Method not allowed',
            'error_code': 'METHOD_NOT_ALLOWED',
            'details': {
                'message': f'The {request.method} method is not allowed for {request.path}'
            },
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 405

    @app.errorhandler(429)
    def handle_rate_limit_exceeded(error):
        """Handle rate limit exceeded errors."""
        logger.warning("rate_limit_exceeded",
                      path=request.path,
                      method=request.method)

        response = {
            'error': 'Rate limit exceeded',
            'error_code': 'RATE_LIMIT_EXCEEDED',
            'details': {
                'message': 'Too many requests. Please try again later.'
            },
            'path': request.path,
            'method': request.method
        }

        return jsonify(response), 429

    logger.info("error_handlers_registered")


def handle_request_validation_error(error, schema, data):
    """Handle request validation errors with detailed feedback."""
    logger.warning("request_validation_error",
                  schema=schema.__class__.__name__,
                  field_errors=error.messages,
                  data=data)

    # Format field errors for better UX
    formatted_errors = {}
    for field, messages in error.messages.items():
        if isinstance(messages, list):
            formatted_errors[field] = messages[0]  # Take first error message
        else:
            formatted_errors[field] = str(messages)

    response = {
        'error': 'Request validation failed',
        'error_code': 'VALIDATION_ERROR',
        'details': {
            'field_errors': formatted_errors,
            'schema': schema.__class__.__name__
        }
    }

    return response, 400
