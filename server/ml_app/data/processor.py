import numpy as np
import pandas as pd
from typing import Optional, Tuple
import structlog
from ..config import ModelConfig
from .polygon_fetcher import PolygonDataFetcher

class DataProcessor:
    def __init__(self, config: ModelConfig):
        self.config = config
        self.mean: Optional[float] = None
        self.std: Optional[float] = None
        self.df: Optional[pd.DataFrame] = None
        self.logger = structlog.get_logger(__name__)
        
        # Initialize Polygon data fetcher
        try:
            self.data_fetcher = PolygonDataFetcher()
            self.logger.info("polygon_fetcher_initialized")
        except Exception as e:
            self.logger.error("failed_to_initialize_polygon_fetcher", error=str(e))
            raise

    def create_windows(self, data: np.ndarray, window_size: int) -> Tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(len(data) - window_size):
            X.append(data[i:i + window_size])
            y.append(data[i + window_size])
        
        # Check if we have enough data
        if len(X) == 0:
            raise ValueError(f"Not enough data points to create windows. Need at least {window_size + 1} points, got {len(data)}")
        
        # Reshape X to (samples, timesteps, features) for LSTM
        X = np.array(X)
        y = np.array(y)
        
        # Add feature dimension if X has more than 1 dimension
        if len(X.shape) == 2:
            X = X.reshape(X.shape[0], X.shape[1], 1)
        
        return X, y

    def fetch_and_prepare_data(self, ticker_symbol: str, start_date: str, end_date: str) -> Tuple[
        Tuple[np.ndarray, np.ndarray],
        Tuple[np.ndarray, np.ndarray],
        np.ndarray
    ]:
        self.logger.info("fetching_data", ticker=ticker_symbol, start_date=start_date, end_date=end_date)
        
        try:
            # Use Polygon fetcher instead of yfinance
            self.df = self.data_fetcher.fetch_historical_data(ticker_symbol, start_date, end_date)
            
            if self.df.empty:
                raise ValueError(f"No data found for ticker {ticker_symbol}")
            
            # Ensure we have the Close column
            if 'Close' not in self.df.columns:
                raise ValueError(f"Missing 'Close' column. Available columns: {list(self.df.columns)}")
            
            close_prices = self.df['Close'].values
            if len(close_prices) < self.config.lookback:
                raise ValueError(f"Insufficient data points. Need at least {self.config.lookback}, got {len(close_prices)}")
            
            self.mean = close_prices.mean()
            self.std = close_prices.std()
            normalized_prices = (close_prices - self.mean) / self.std
            
            # Ensure we have enough data for both training and testing
            min_required = self.config.lookback + 1
            if len(normalized_prices) < min_required:
                raise ValueError(f"Insufficient data for training. Need at least {min_required} points, got {len(normalized_prices)}")
            
            train_size = max(int(len(normalized_prices) * self.config.train_test_split), min_required)
            train_data = normalized_prices[:train_size]
            test_data = normalized_prices[train_size:]
            
            # Ensure test data has enough points for at least one window
            if len(test_data) < self.config.lookback + 1:
                # Adjust train size to leave enough for testing
                train_size = len(normalized_prices) - (self.config.lookback + 1)
                if train_size < min_required:
                    raise ValueError(f"Cannot create separate train/test sets. Total data: {len(normalized_prices)}, lookback: {self.config.lookback}")
                train_data = normalized_prices[:train_size]
                test_data = normalized_prices[train_size:]
            
            X_train, y_train = self.create_windows(train_data, self.config.lookback)
            X_test, y_test = self.create_windows(test_data, self.config.lookback)
            
            self.logger.info("data_preparation_successful", 
                           ticker=ticker_symbol,
                           total_points=len(close_prices),
                           train_points=len(train_data),
                           test_points=len(test_data))
            
            return (X_train, y_train), (X_test, y_test), close_prices
        except Exception as e:
            self.logger.error("data_preparation_failed", error=str(e))
            raise