import pandas as pd
from datetime import datetime, timedelta
import structlog
import os
from polygon import RESTClient

logger = structlog.get_logger(__name__)

def get_polygon_client():
    """Get Polygon.io REST client"""
    api_key = os.getenv('POLYGON_API_KEY')
    if not api_key:
        raise ValueError("POLYGON_API_KEY environment variable is required")
    return RESTClient(api_key)

def fetch_historical_data(ticker: str, start_date: datetime, lookback: int, max_retries: int = 3) -> pd.DataFrame:
    """
    Fetches historical data for the specified ticker and date range using Polygon.io.
    Retries up to `max_retries` times if the data fetch fails.
    """
    end_date = datetime.now().date() - timedelta(days=1)  # Fetch data up to yesterday
    df = pd.DataFrame()

    for attempt in range(max_retries):
        try:
            adjusted_start_date = start_date - timedelta(days=lookback + attempt)
            
            # Use Polygon.io instead of yfinance
            client = get_polygon_client()
            aggs = client.get_aggs(
                ticker=ticker,
                multiplier=1,
                timespan='day',
                from_=adjusted_start_date.strftime('%Y-%m-%d'),
                to=end_date.strftime('%Y-%m-%d'),
                adjusted=True,
                sort='asc',
                limit=50000
            )
            
            if aggs:
                # Convert to DataFrame
                data = []
                for agg in aggs:
                    data.append({
                        'Date': pd.to_datetime(agg.timestamp, unit='ms'),
                        'Open': agg.open,
                        'High': agg.high,
                        'Low': agg.low,
                        'Close': agg.close,
                        'Volume': agg.volume
                    })
                
                df = pd.DataFrame(data)
                df.set_index('Date', inplace=True)
                
                if not df.empty:
                    logger.info("polygon_data_fetched_successfully", 
                              ticker=ticker, 
                              rows=len(df),
                              attempt=attempt + 1)
                    return df
                    
        except Exception as e:
            logger.warning("data_fetch_attempt_failed", 
                         attempt=attempt + 1, 
                         ticker=ticker, 
                         error=str(e))
            continue

    logger.error("no_data_found", ticker=ticker, start_date=start_date.isoformat(), end_date=end_date.isoformat())
    return None


def make_predictions(predictor, historical_data: pd.DataFrame, days: int) -> list:
    """
    Makes predictions using the trained model and historical data.
    """
    close_prices = historical_data['Close'].values
    normalized_prices = (close_prices - predictor.data_processor.mean) / predictor.data_processor.std

    X = predictor.data_processor.create_windows(normalized_prices, predictor.config.lookback)[0]
    predictions = predictor.predict_multiple_days(X[-1], days)
    return predictions