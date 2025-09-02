"""Middleware for the crypto prediction API."""

from flask import request, g, current_app
from functools import wraps
import time
import hashlib
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter (use Redis in production)."""
    
    def __init__(self):
        self.requests = {}
        self.limits = {
            'default': {'limit': 100, 'window': 60},  # 100 requests per minute
            'training': {'limit': 10, 'window': 60},   # 10 training requests per minute
            'prediction': {'limit': 50, 'window': 60}, # 50 predictions per minute
        }
    
    def is_allowed(self, key: str, endpoint: str = 'default') -> bool:
        """Check if request is allowed."""
        now = time.time()
        limit_info = self.limits.get(endpoint, self.limits['default'])
        
        if key not in self.requests:
            self.requests[key] = []
        
        # Clean old requests
        self.requests[key] = [req_time for req_time in self.requests[key] 
                            if now - req_time < limit_info['window']]
        
        # Check limit
        if len(self.requests[key]) >= limit_info['limit']:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(endpoint: str = 'default'):
    """Rate limiting decorator."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier (IP or user ID)
            client_id = get_client_identifier()
            
            if not rate_limiter.is_allowed(client_id, endpoint):
                logger.warning("rate_limit_exceeded", 
                              client_id=client_id, 
                              endpoint=endpoint)
                return {
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests for {endpoint} endpoint'
                }, 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_client_identifier() -> str:
    """Get unique client identifier."""
    # In production, use user ID from JWT token
    # For now, use IP address
    client_ip = request.remote_addr or 'unknown'
    user_agent = request.headers.get('User-Agent', 'unknown')
    
    # Create hash for privacy
    identifier = f"{client_ip}:{user_agent}"
    return hashlib.sha256(identifier.encode()).hexdigest()[:16]


class SecurityMiddleware:
    """Security middleware for request processing."""
    
    @staticmethod
    def before_request():
        """Process request before handling."""
        g.start_time = time.time()
        g.request_id = request.headers.get('X-Request-ID', None)
        
        # Log request
        logger.info("request_received",
                   method=request.method,
                   path=request.path,
                   client_ip=request.remote_addr,
                   user_agent=request.headers.get('User-Agent', 'unknown'))
        
        # Security headers
        request.environ['HTTP_X_FORWARDED_PROTO'] = 'https'
    
    @staticmethod
    def after_request(response):
        """Process response after handling."""
        # Calculate response time
        if hasattr(g, 'start_time'):
            response_time = time.time() - g.start_time
            response.headers['X-Response-Time'] = str(response_time)
        
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Log response
        logger.info("response_sent",
                   method=request.method,
                   path=request.path,
                   status_code=response.status_code,
                   response_time=response_time if hasattr(g, 'start_time') else None)
        
        return response
    
    @staticmethod
    def teardown_request(exception=None):
        """Clean up after request."""
        if exception:
            logger.error("request_error",
                        method=request.method,
                        path=request.path,
                        error=str(exception))


def setup_middleware(app):
    """Setup all middleware for the application."""
    security = SecurityMiddleware()
    
    app.before_request(security.before_request)
    app.after_request(security.after_request)
    app.teardown_request(security.teardown_request)
    
    logger.info("middleware_setup_complete")
