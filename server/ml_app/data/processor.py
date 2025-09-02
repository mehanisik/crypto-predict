import numpy as np
import pandas as pd
from typing import Optional, Tuple
import structlog
from ..config import ModelConfig
from .polygon_fetcher import PolygonDataFetcher

class DataProcessor:
    def __init__(self, config: ModelConfig):
        self.config = config
        self.mean: Optional[np.ndarray] = None
        self.std: Optional[np.ndarray] = None
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
        """
        Create sliding windows for time series data with multiple features.
        
        Args:
            data: Input data with shape (timesteps, features)
            window_size: Size of the sliding window
            
        Returns:
            X: Input windows with shape (samples, timesteps, features)
            y: Target values with shape (samples, features) or (samples,) for single target
        """
        X, y = [], []
        for i in range(len(data) - window_size):
            X.append(data[i:i + window_size])
            # For multi-feature data, we predict the close price (last feature)
            if data.shape[1] > 1:
                y.append(data[i + window_size, -1])  # Close price (last column)
            else:
                y.append(data[i + window_size])
        
        # Check if we have enough data
        if len(X) == 0:
            raise ValueError(f"Not enough data points to create windows. Need at least {window_size + 1} points, got {len(data)}")
        
        # Convert to numpy arrays
        X = np.array(X)
        y = np.array(y)
        
        return X, y

    def fetch_and_prepare_data(self, ticker_symbol: str, start_date: str, end_date: str, 
                             use_multiple_features: bool = True) -> Tuple[
        Tuple[np.ndarray, np.ndarray],
        Tuple[np.ndarray, np.ndarray],
        np.ndarray
    ]:
        """
        Fetch and prepare data for training.
        
        Args:
            ticker_symbol: Stock/crypto ticker symbol
            start_date: Start date for data
            end_date: End date for data
            use_multiple_features: If True, use OHLCV features; if False, use only Close price
            
        Returns:
            Tuple of (X_train, y_train), (X_test, y_test), original_prices
        """
        self.logger.info("fetching_data", ticker=ticker_symbol, start_date=start_date, end_date=end_date)
        
        try:
            # Use Polygon fetcher instead of yfinance
            self.df = self.data_fetcher.fetch_historical_data(ticker_symbol, start_date, end_date)
            
            if self.df.empty:
                raise ValueError(f"No data found for ticker {ticker_symbol}")
            
            # Ensure we have the required columns
            required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            if not all(col in self.df.columns for col in required_columns):
                raise ValueError(f"Missing required columns. Available columns: {list(self.df.columns)}")
            
            if use_multiple_features:
                # Use all OHLCV features
                features = self.df[required_columns].values
                self.logger.info("using_multiple_features", features_count=len(required_columns))
            else:
                # Use only Close price (backward compatibility)
                features = self.df['Close'].values.reshape(-1, 1)
                self.logger.info("using_single_feature")
            
            if len(features) < self.config.lookback:
                raise ValueError(f"Insufficient data points. Need at least {self.config.lookback}, got {len(features)}")
            
            # Normalize features
            if use_multiple_features:
                # Normalize each feature separately
                self.mean = np.mean(features, axis=0)
                self.std = np.std(features, axis=0)
                # Avoid division by zero
                self.std = np.where(self.std == 0, 1, self.std)
                normalized_features = (features - self.mean) / self.std
            else:
                # Single feature normalization (backward compatibility)
                self.mean = features.mean()
                self.std = features.std()
                normalized_features = (features - self.mean) / self.std
            
            # Ensure we have enough data for both training and testing
            min_required = self.config.lookback + 1
            if len(normalized_features) < min_required:
                raise ValueError(f"Insufficient data for training. Need at least {min_required} points, got {len(normalized_features)}")
            
            train_size = max(int(len(normalized_features) * self.config.train_test_split), min_required)
            train_data = normalized_features[:train_size]
            test_data = normalized_features[train_size:]
            
            # Ensure test data has enough points for at least one window
            if len(test_data) < self.config.lookback + 1:
                # Adjust train size to leave enough for testing
                train_size = len(normalized_features) - (self.config.lookback + 1)
                if train_size < min_required:
                    raise ValueError(f"Cannot create separate train/test sets. Total data: {len(normalized_features)}, lookback: {self.config.lookback}")
                train_data = normalized_features[:train_size]
                test_data = normalized_features[train_size:]
            
            X_train, y_train = self.create_windows(train_data, self.config.lookback)
            X_test, y_test = self.create_windows(test_data, self.config.lookback)
            
            # Get original close prices for visualization
            original_prices = self.df['Close'].values
            
            self.logger.info("data_preparation_successful", 
                           ticker=ticker_symbol,
                           total_points=len(original_prices),
                           train_points=len(train_data),
                           test_points=len(test_data),
                           features_count=features.shape[1] if len(features.shape) > 1 else 1)
            
            return (X_train, y_train), (X_test, y_test), original_prices
        except Exception as e:
            self.logger.error("data_preparation_failed", error=str(e))
            raise