"""Custom exceptions for the crypto prediction API."""

from typing import Any, Dict


class CryptoPredictionError(Exception):
    """Base exception for crypto prediction API."""

    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            'error': self.message,
            'error_code': self.error_code,
            'details': self.details
        }


class ValidationError(CryptoPredictionError):
    """Raised when input validation fails."""

    def __init__(self, message: str, field_errors: Dict[str, Any] = None):
        super().__init__(message, 'VALIDATION_ERROR', {'field_errors': field_errors or {}})


class DatabaseError(CryptoPredictionError):
    """Raised when database operations fail."""

    def __init__(self, message: str, operation: str = None, table: str = None):
        super().__init__(message, 'DATABASE_ERROR', {
            'operation': operation,
            'table': table
        })


class TrainingError(CryptoPredictionError):
    """Raised when training operations fail."""

    def __init__(self, message: str, session_id: str = None, stage: str = None):
        super().__init__(message, 'TRAINING_ERROR', {
            'session_id': session_id,
            'stage': stage
        })


class PredictionError(CryptoPredictionError):
    """Raised when prediction operations fail."""

    def __init__(self, message: str, ticker: str = None, model_type: str = None):
        super().__init__(message, 'PREDICTION_ERROR', {
            'ticker': ticker,
            'model_type': model_type
        })


class ModelNotFoundError(CryptoPredictionError):
    """Raised when a requested model is not found."""

    def __init__(self, message: str, model_type: str = None, ticker: str = None):
        super().__init__(message, 'MODEL_NOT_FOUND', {
            'model_type': model_type,
            'ticker': ticker
        })


class RateLimitError(CryptoPredictionError):
    """Raised when rate limits are exceeded."""

    def __init__(self, message: str, limit: int = None, window: int = None):
        super().__init__(message, 'RATE_LIMIT_EXCEEDED', {
            'limit': limit,
            'window': window
        })


class AuthenticationError(CryptoPredictionError):
    """Raised when authentication fails."""

    def __init__(self, message: str, token_type: str = None):
        super().__init__(message, 'AUTHENTICATION_FAILED', {
            'token_type': token_type
        })


class AuthorizationError(CryptoPredictionError):
    """Raised when authorization fails."""

    def __init__(self, message: str, required_permission: str = None):
        super().__init__(message, 'AUTHORIZATION_FAILED', {
            'required_permission': required_permission
        })


class ServiceUnavailableError(CryptoPredictionError):
    """Raised when external services are unavailable."""

    def __init__(self, message: str, service: str = None, retry_after: int = None):
        super().__init__(message, 'SERVICE_UNAVAILABLE', {
            'service': service,
            'retry_after': retry_after
        })
