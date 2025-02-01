import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger(__name__)


def fetch_historical_data(ticker: str, start_date: datetime, lookback: int, max_retries: int = 3) -> pd.DataFrame:
    """
    Fetches historical data for the specified ticker and date range.
    Retries up to `max_retries` times if the data fetch fails.
    """
    end_date = datetime.now().date() - timedelta(days=1)  # Fetch data up to yesterday
    df = pd.DataFrame()

    for attempt in range(max_retries):
        try:
            adjusted_start_date = start_date - timedelta(days=lookback + attempt)
            df = yf.download(ticker, start=adjusted_start_date.isoformat(), end=end_date.isoformat())
            if not df.empty:
                return df
        except Exception as e:
            logger.warning("data_fetch_attempt_failed", attempt=attempt + 1, ticker=ticker, error=str(e))
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