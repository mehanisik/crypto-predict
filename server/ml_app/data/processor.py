import yfinance as yf
import numpy as np
import pandas as pd
from typing import Optional, Tuple
import structlog
from ..config import ModelConfig

class DataProcessor:
    def __init__(self, config: ModelConfig):
        self.config = config
        self.mean: Optional[float] = None
        self.std: Optional[float] = None
        self.df: Optional[pd.DataFrame] = None
        self.logger = structlog.get_logger(__name__)

    def create_windows(self, data: np.ndarray, window_size: int) -> Tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(len(data) - window_size):
            X.append(data[i:i + window_size])
            y.append(data[i + window_size])
        return np.array(X), np.array(y)

    def fetch_and_prepare_data(self, ticker_symbol: str, start_date: str, end_date: str) -> Tuple[
        Tuple[np.ndarray, np.ndarray],
        Tuple[np.ndarray, np.ndarray],
        np.ndarray
    ]:
        self.logger.info("fetching_data", ticker=ticker_symbol, start_date=start_date, end_date=end_date)
        
        try:
            self.df = yf.Ticker(ticker_symbol).history(start=start_date, end=end_date)
            if self.df.empty:
                raise ValueError(f"No data found for ticker {ticker_symbol}")
            
            close_prices = self.df['Close'].values
            if len(close_prices) < self.config.lookback:
                raise ValueError(f"Insufficient data points")
            
            self.mean = close_prices.mean()
            self.std = close_prices.std()
            normalized_prices = (close_prices - self.mean) / self.std
            
            train_size = int(len(normalized_prices) * self.config.train_test_split)
            train_data = normalized_prices[:train_size]
            test_data = normalized_prices[train_size:]
            
            X_train, y_train = self.create_windows(train_data, self.config.lookback)
            X_test, y_test = self.create_windows(test_data, self.config.lookback)
            
            return (X_train, y_train), (X_test, y_test), close_prices
        except Exception as e:
            self.logger.error("data_preparation_failed", error=str(e))
            raise