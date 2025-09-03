import uuid
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)


def generate_request_id() -> str:
    """Generate a unique request ID with timestamp and UUID components."""
    # Get current timestamp with microseconds for better uniqueness
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]  # Include milliseconds
    # Generate a full UUID and take more characters for better uniqueness
    unique_id = str(uuid.uuid4()).replace('-', '')[:12]
    return f"{timestamp}_{unique_id}"


def fetch_historical_data(ticker: str, start_date: datetime, lookback: int) -> Optional[Any]:
    try:
        from app.ml_app.data.polygon_fetcher import PolygonFetcher
        
        fetcher = PolygonFetcher()
        return fetcher.fetch_data(ticker, start_date, lookback)
        
    except Exception as e:
        logger.error("historical_data_fetch_failed", 
                    ticker=ticker,
                    start_date=start_date,
                    lookback=lookback,
                    error=str(e))
        return None


def make_predictions(predictor: Any, historical_data: Any, days: int) -> List[Dict[str, Any]]:
    try:
        predictions = predictor.predict(historical_data, days)
        
        formatted_predictions = []
        for i, pred in enumerate(predictions):
            prediction_date = datetime.now().date() + timedelta(days=i+1)
            formatted_predictions.append({
                'date': prediction_date.isoformat(),
                'price': float(pred),
                'confidence': 0.85
            })
        
        return formatted_predictions
        
    except Exception as e:
        logger.error("prediction_generation_failed", 
                    error=str(e),
                    exc_info=True)
        raise


def validate_date_range(start_date: datetime, end_date: datetime, 
                       max_days: int = 365) -> bool:
    if start_date >= end_date:
        return False
    
    days_diff = (end_date - start_date).days
    if days_diff > max_days:
        return False
    
    return True


def format_error_response(error: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    response = {
        'error': error,
        'timestamp': datetime.now().isoformat()
    }
    
    if details:
        response['details'] = details
    
    return response


def format_success_response(data: Any, message: Optional[str] = None) -> Dict[str, Any]:
    response = {
        'status': 'success',
        'data': data,
        'timestamp': datetime.now().isoformat()
    }
    
    if message:
        response['message'] = message
    
    return response


def sanitize_input(text: str, max_length: int = 100) -> str:
    if not text:
        return ""
    
    sanitized = text.strip()
    sanitized = sanitized.replace('<', '&lt;').replace('>', '&gt;')
    sanitized = sanitized.replace('"', '&quot;').replace("'", '&#39;')
    
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length] + '...'
    
    return sanitized


def calculate_percentage(part: float, total: float) -> float:
    if total == 0:
        return 0.0
    
    return round((part / total) * 100, 2)


def is_valid_ticker(ticker: str) -> bool:
    if not ticker:
        return False
    
    if not ticker.isalpha() or len(ticker) > 10:
        return False
    
    return True


def parse_date_string(date_string: str) -> Optional[datetime]:
    try:
        formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%m/%d/%Y',
            '%d/%m/%Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_string, fmt)
            except ValueError:
                continue
        
        return None
        
    except Exception:
        return None
