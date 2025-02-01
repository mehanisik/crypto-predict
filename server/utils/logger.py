import structlog
import logging
import sys
from typing import Optional

def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure structured logging for the application.
    
    Args:
        log_level: The logging level to use (default: "INFO")
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, log_level.upper())
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True
    )

def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a structured logger instance.
    
    Args:
        name: The name of the logger (typically __name__)
    
    Returns:
        A structured logger instance
    """
    return structlog.get_logger(name)

class RequestIdContext:
    """Context manager for adding request_id to log entries"""
    def __init__(self, request_id: str):
        self.request_id = request_id
        self.logger = structlog.get_logger()
        
    def __enter__(self):
        self.logger = self.logger.bind(request_id=self.request_id)
        return self.logger
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logger = self.logger.unbind("request_id")