import pandas as pd  # type: ignore
from datetime import datetime, timedelta
from typing import Optional
import structlog
import os
from polygon import RESTClient  # type: ignore

logger = structlog.get_logger(__name__)

class PolygonDataFetcher:
    """
    Data fetcher using Polygon.io API for reliable financial data
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('POLYGON_API_KEY')
        if not self.api_key:
            raise ValueError("Polygon API key is required. Set POLYGON_API_KEY environment variable.")

        # Create REST client
        self.client = RESTClient(self.api_key)
        self.logger = structlog.get_logger(__name__)

    def __del__(self):
        """Cleanup method"""

    def fetch_historical_data(self, ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Fetch historical OHLCV data from Polygon.io
        
        Args:
            ticker: Stock/crypto ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            
        Returns:
            DataFrame with OHLCV data
        """
        try:
            # Normalize crypto tickers like BTC-USD -> X:BTCUSD for Polygon
            normalized_ticker = ticker
            if '-' in ticker and ticker.upper().endswith('-USD'):
                try:
                    base, quote = ticker.split('-')
                    normalized_ticker = f"X:{base.upper()}{quote.upper()}"
                except Exception:
                    normalized_ticker = ticker

            self.logger.info("fetching_polygon_data", ticker=normalized_ticker, start_date=start_date, end_date=end_date)

            # Convert dates to datetime objects
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')

            # Fetch data from Polygon - using daily data (multiplier=1, timespan=day)
            aggs = self.client.get_aggs(
                ticker=normalized_ticker,
                multiplier=1,
                timespan='day',
                from_=start_dt.strftime('%Y-%m-%d'),
                to=end_dt.strftime('%Y-%m-%d'),
                adjusted=True,
                sort='asc',
                limit=50000
            )

            if not aggs:
                raise ValueError(f"No data returned for ticker {normalized_ticker}")

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

            # Ensure we have the required columns
            required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            if not all(col in df.columns for col in required_columns):
                raise ValueError(f"Missing required columns. Got: {list(df.columns)}")

            self.logger.info("polygon_data_fetched",
                           ticker=ticker,
                           rows=len(df),
                           date_range=f"{df.index[0]} to {df.index[-1]}")

            return df

        except Exception as e:
            self.logger.error("polygon_data_fetch_failed",
                            ticker=ticker,
                            error=str(e),
                            exc_info=True)
            raise

    def get_available_tickers(self, market: str = "stocks") -> list:
        """
        Get list of available tickers for a given market
        
        Args:
            market: Market type (stocks, crypto, forex, etc.)
            
        Returns:
            List of available tickers
        """
        try:
            if market == "crypto":
                # For crypto, we'll use common pairs
                return ["BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "DOGE-USD"]
            elif market == "stocks":
                # For stocks, we'll use common ones
                return ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
            else:
                return []
        except Exception as e:
            self.logger.error("failed_to_get_tickers", market=market, error=str(e))
            return []

    def validate_ticker(self, ticker: str) -> bool:
        """
        Validate if a ticker exists and is accessible
        
        Args:
            ticker: Ticker symbol to validate
            
        Returns:
            True if ticker is valid, False otherwise
        """
        try:
            # Try to fetch a small amount of data to validate
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5)

            aggs = self.client.get_aggs(
                ticker=ticker,
                multiplier=1,
                timespan='day',
                from_=start_date.strftime('%Y-%m-%d'),
                to=end_date.strftime('%Y-%m-%d'),
                limit=5
            )

            return len(aggs) > 0

        except Exception as e:
            self.logger.warning("ticker_validation_failed", ticker=ticker, error=str(e))
            return False
