import structlog
import logging
import sys
from datetime import datetime

def setup_logging() -> None:
    """Configure structured logging for the application."""

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)

class LoggerMixin:
    """Mixin to add logging capabilities to classes."""

    @property
    def logger(self) -> structlog.BoundLogger:
        """Get logger instance for the class."""
        return structlog.get_logger(self.__class__.__name__)

def log_function_call(func):
    """Decorator to log function calls with parameters and timing."""
    def wrapper(*args, **kwargs):
        logger = structlog.get_logger(func.__module__)

        start_time = datetime.now()
        logger.info("function_call_start",
                   function=func.__name__,
                   args=args,
                   kwargs=kwargs)

        try:
            result = func(*args, **kwargs)
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            logger.info("function_call_success",
                       function=func.__name__,
                       duration=duration,
                       result_type=type(result).__name__)
            return result

        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            logger.error("function_call_failed",
                        function=func.__name__,
                        duration=duration,
                        error=str(e),
                        exc_info=True)
            raise

    return wrapper

def log_api_request(func):
    """Decorator to log API requests with structured data."""
    def wrapper(*args, **kwargs):
        logger = structlog.get_logger(func.__module__)

        request_id = kwargs.get('request_id', 'unknown')
        endpoint = func.__name__

        logger.info("api_request_start",
                   request_id=request_id,
                   endpoint=endpoint,
                   method=kwargs.get('method', 'unknown'))

        try:
            result = func(*args, **kwargs)

            logger.info("api_request_success",
                       request_id=request_id,
                       endpoint=endpoint,
                       status_code=kwargs.get('status_code', 200))
            return result

        except Exception as e:
            logger.error("api_request_failed",
                        request_id=request_id,
                        endpoint=endpoint,
                        error=str(e),
                        exc_info=True)
            raise

    return wrapper

def log_training_event(event_type: str, session_id: str, **kwargs):
    """Log training events with structured data."""
    logger = structlog.get_logger("training")
    logger.info("training_event",
               event_type=event_type,
               session_id=session_id,
               **kwargs)

def log_prediction_event(event_type: str, request_id: str, **kwargs):
    """Log prediction events with structured data."""
    logger = structlog.get_logger("prediction")
    logger.info("prediction_event",
               event_type=event_type,
               request_id=request_id,
               **kwargs)

def log_database_event(event_type: str, table: str, **kwargs):
    """Log database events with structured data."""
    logger = structlog.get_logger("database")
    logger.info("database_event",
               event_type=event_type,
               table=table,
               **kwargs)

def log_websocket_event(event_type: str, room: str, **kwargs):
    """Log WebSocket events with structured data."""
    logger = structlog.get_logger("websocket")
    logger.info("websocket_event",
               event_type=event_type,
               room=room,
               **kwargs)

def log_system_event(event_type: str, component: str, **kwargs):
    """Log system events with structured data."""
    logger = structlog.get_logger("system")
    logger.info("system_event",
               event_type=event_type,
               component=component,
               **kwargs)
