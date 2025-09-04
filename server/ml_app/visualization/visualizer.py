import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from functools import wraps
import io
import os
import uuid
from datetime import datetime, timedelta
import matplotlib.dates as mdates
from pathlib import Path

# Create plots directory if it doesn't exist
PLOTS_DIR = Path("/app/static/plots")
PLOTS_DIR.mkdir(parents=True, exist_ok=True)

class PlotManager:
    """Manages plot file storage and cleanup"""
    
    def __init__(self, max_age_hours: int = 24, max_files: int = 100):
        self.max_age_hours = max_age_hours
        self.max_files = max_files
    
    def cleanup_old_plots(self):
        """Clean up plot files older than max_age_hours or exceeding max_files"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=self.max_age_hours)
            files = list(PLOTS_DIR.glob("*.png"))
            
            # Remove old files
            for file_path in files:
                if file_path.stat().st_mtime < cutoff_time.timestamp():
                    file_path.unlink()
            
            # If still too many files, remove oldest ones
            files = list(PLOTS_DIR.glob("*.png"))
            if len(files) > self.max_files:
                files.sort(key=lambda x: x.stat().st_mtime)
                for file_path in files[:-self.max_files]:
                    file_path.unlink()
                    
        except Exception as e:
            print(f"Error cleaning up old plots: {e}")
    
    def get_plot_url(self, filename: str) -> str:
        """Get the URL for a plot file"""
        return f"/static/plots/{filename}"
    
    def create_plot_filename(self) -> str:
        """Create a unique plot filename"""
        return f"{uuid.uuid4()}.png"

# Global plot manager instance
plot_manager = PlotManager()

def cleanup_old_plots(max_age_hours: int = 24):
    """Clean up plot files older than max_age_hours"""
    plot_manager.cleanup_old_plots()

def create_plot(func):
    """Decorator to create and save matplotlib plots as files"""
    def wrapper(*args, **kwargs):
        try:
            # Clean up old plots before creating new ones
            plot_manager.cleanup_old_plots()
            
            # Close any existing figures to prevent memory leaks
            plt.close('all')
            
            fig, ax = plt.subplots(figsize=(10, 6))
            kwargs['ax'] = ax
            func(*args, **kwargs)
            
            # Generate unique filename
            filename = plot_manager.create_plot_filename()
            filepath = PLOTS_DIR / filename
            
            # Save plot as file with optimized settings
            fig.savefig(filepath, format='png', dpi=150, bbox_inches='tight')
            plt.close(fig)
            
            # Return URL instead of base64
            return plot_manager.get_plot_url(filename)
        except Exception as e:
            # Ensure figure is closed even if there's an error
            plt.close('all')
            raise e
    return wrapper

class Visualizer:

    @staticmethod
    @create_plot
    def plot_predictions(original_prices: np.ndarray, train_pred: np.ndarray, 
                        test_pred: np.ndarray, train_size: int, lookback: int, 
                        mean: float, std: float, ax: plt.Axes) -> None:
        ax.plot(original_prices, label='Original', color='red', alpha=0.5)
        train_index = range(lookback, len(train_pred) + lookback)
        ax.plot(train_index, train_pred * std + mean, label='Train Predictions', color='blue')
        test_index = range(train_size, train_size + len(test_pred))
        ax.plot(test_index, test_pred * std + mean, label='Test Predictions', color='green')
        ax.set_title('Stock Price Predictions')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_loss(history: Dict[str, List[float]], ax: plt.Axes) -> None:
        ax.plot(history['loss'], label='Training Loss', color='blue')
        ax.plot(history['val_loss'], label='Validation Loss', color='red')
        ax.set_title('Model Loss During Training')
        ax.set_xlabel('Epoch')
        ax.set_ylabel('Loss')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_residuals(y_true: np.ndarray, y_pred: np.ndarray, mean: float, std: float, ax: plt.Axes) -> None:
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        residuals = y_true_denorm - y_pred_denorm
        
        ax.scatter(y_pred_denorm, residuals, alpha=0.5)
        ax.axhline(y=0, color='r', linestyle='--')
        ax.set_title('Residual Plot')
        ax.set_xlabel('Predicted Values')
        ax.set_ylabel('Residuals')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_error_distribution(y_true: np.ndarray, y_pred: np.ndarray, mean: float, std: float, ax: plt.Axes) -> None:
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        errors = y_true_denorm - y_pred_denorm
        
        sns.histplot(errors, kde=True, ax=ax)
        ax.axvline(x=0, color='r', linestyle='--')
        ax.set_title('Prediction Error Distribution')
        ax.set_xlabel('Prediction Error')
        ax.set_ylabel('Frequency')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_qq(y_true: np.ndarray, y_pred: np.ndarray, mean: float, std: float, ax: plt.Axes) -> None:
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        residuals = y_true_denorm - y_pred_denorm
        
        stats.probplot(residuals, dist="norm", plot=ax)
        ax.set_title('Q-Q Plot of Residuals')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_prediction_scatter(y_true: np.ndarray, y_pred: np.ndarray, mean: float, std: float, ax: plt.Axes) -> None:
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        
        ax.scatter(y_true_denorm, y_pred_denorm, alpha=0.5)
        min_val = min(y_true_denorm.min(), y_pred_denorm.min())
        max_val = max(y_true_denorm.max(), y_pred_denorm.max())
        ax.plot([min_val, max_val], [min_val, max_val], 'r--')
        ax.set_title('Actual vs Predicted Values')
        ax.set_xlabel('Actual Values')
        ax.set_ylabel('Predicted Values')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_rolling_metrics(y_true: np.ndarray, y_pred: np.ndarray, mean: float, std: float, ax: plt.Axes, window: int = 20) -> None:
        """Plot rolling MAE and RMSE metrics."""
        # Denormalize the values
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        
        # Create DataFrame with true and predicted values
        df = pd.DataFrame({
            'true': y_true_denorm,
            'pred': y_pred_denorm
        })
        
        # Calculate rolling metrics
        df['mae'] = abs(df['true'] - df['pred']).rolling(window=window).mean()
        df['rmse'] = np.sqrt(((df['true'] - df['pred'])**2).rolling(window=window).mean())
        
        # Create twin axis for better visualization
        ax2 = ax.twinx()
        
        # Plot metrics with different colors and line styles
        line1 = ax.plot(df.index, df['mae'], label=f'{window}-day Rolling MAE', 
                       color='blue', linestyle='-', linewidth=2)
        line2 = ax2.plot(df.index, df['rmse'], label=f'{window}-day Rolling RMSE', 
                        color='red', linestyle='--', linewidth=2)
        
        # Set labels and title
        ax.set_title(f'Rolling Performance Metrics (Window: {window} days)')
        ax.set_xlabel('Time Period')
        ax.set_ylabel('MAE', color='blue')
        ax2.set_ylabel('RMSE', color='red')
        
        # Customize tick colors
        ax.tick_params(axis='y', labelcolor='blue')
        ax2.tick_params(axis='y', labelcolor='red')
        
        # Combine legends from both axes
        lines = line1 + line2
        labels = [l.get_label() for l in lines]
        ax.legend(lines, labels, loc='upper left')
        
        # Add grid
        ax.grid(True, alpha=0.3)

    @staticmethod
    @create_plot
    def plot_loss_history(history: Dict[str, list], ax: plt.Axes) -> None:
        """Plot training and validation loss history."""
        ax.plot(history['loss'], label='Training Loss', color='blue')
        if 'val_loss' in history:
            ax.plot(history['val_loss'], label='Validation Loss', color='red')
        ax.set_title('Model Loss Over Time')
        ax.set_xlabel('Epoch')
        ax.set_ylabel('Loss')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_price_distribution(prices: np.ndarray, ax: plt.Axes) -> None:
        """Plot price distribution with KDE."""
        sns.histplot(prices, kde=True, ax=ax)
        ax.set_title('Price Distribution')
        ax.set_xlabel('Price')
        ax.set_ylabel('Frequency')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_returns_distribution(prices: np.ndarray, ax: plt.Axes) -> None:
        """Plot returns distribution with normal distribution fit."""
        returns = np.diff(prices) / prices[:-1]
        sns.histplot(returns, kde=True, stat='density', ax=ax)
        
        # Fit normal distribution
        mu, std = stats.norm.fit(returns)
        xmin, xmax = ax.get_xlim()
        x = np.linspace(xmin, xmax, 100)
        p = stats.norm.pdf(x, mu, std)
        ax.plot(x, p, 'k', linewidth=2, label=f'Normal (μ={mu:.2f}, σ={std:.2f})')
        
        ax.set_title('Returns Distribution')
        ax.set_xlabel('Returns')
        ax.set_ylabel('Density')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_volatility(prices: np.ndarray, ax: plt.Axes, window: int = 20) -> None:
        """Plot rolling volatility."""
        returns = np.diff(prices) / prices[:-1]
        volatility = pd.Series(returns).rolling(window=window).std() * np.sqrt(252)  # Annualized
        ax.plot(volatility, color='red')
        ax.set_title(f'{window}-Day Rolling Volatility')
        ax.set_xlabel('Time')
        ax.set_ylabel('Volatility')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_confidence_intervals(dates: List[datetime], predictions: List[Dict], ax: plt.Axes) -> None:
        """Plot predictions with confidence intervals."""
        pred_dates = [datetime.fromisoformat(p['timestamp']) for p in predictions]
        pred_values = [p['predicted_value'] for p in predictions]
        lower_bounds = [p['lower_bound'] for p in predictions]
        upper_bounds = [p['upper_bound'] for p in predictions]

        # Plot the main prediction line
        ax.plot(pred_dates, pred_values, 'b-', label='Predicted Price')
        
        # Plot confidence intervals
        ax.fill_between(pred_dates, lower_bounds, upper_bounds, 
                       color='blue', alpha=0.2, label='Confidence Interval')

        # Format x-axis to show dates nicely
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)

        ax.set_title('Price Predictions with Confidence Intervals')
        ax.set_xlabel('Date')
        ax.set_ylabel('Price')
        ax.legend()
        ax.grid(True)



    @staticmethod
    @create_plot
    def plot_candlestick(df: pd.DataFrame, ax: plt.Axes, last_n_days: int = 30) -> None:
        """Plot candlestick chart for the last n days."""
        df = df.tail(last_n_days).copy()
        
        # Calculate candlestick positions
        width = 0.6
        up = df[df.Close >= df.Open]
        down = df[df.Close < df.Open]
        
        # Plot up candlesticks
        ax.bar(up.index, up.Close - up.Open, width, bottom=up.Open, color='green', alpha=0.5)
        ax.bar(up.index, up.High - up.Close, width/5, bottom=up.Close, color='green')
        ax.bar(up.index, up.Low - up.Open, width/5, bottom=up.Open, color='green')
        
        # Plot down candlesticks
        ax.bar(down.index, down.Close - down.Open, width, bottom=down.Open, color='red', alpha=0.5)
        ax.bar(down.index, down.High - down.Open, width/5, bottom=down.Open, color='red')
        ax.bar(down.index, down.Low - down.Close, width/5, bottom=down.Close, color='red')
        
        ax.set_title('Candlestick Chart')
        ax.set_xlabel('Date')
        ax.set_ylabel('Price')
        plt.xticks(rotation=45)
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_bollinger_bands(prices: np.ndarray, ax: plt.Axes, window: int = 20) -> None:
        """Plot Bollinger Bands."""
        df = pd.DataFrame({'price': prices})
        rolling_mean = df['price'].rolling(window=window).mean()
        rolling_std = df['price'].rolling(window=window).std()
        
        upper_band = rolling_mean + (rolling_std * 2)
        lower_band = rolling_mean - (rolling_std * 2)
        
        ax.plot(df.index, df['price'], label='Price', color='blue')
        ax.plot(df.index, rolling_mean, label='Moving Average', color='orange')
        ax.plot(df.index, upper_band, label='Upper Band', color='red', linestyle='--')
        ax.plot(df.index, lower_band, label='Lower Band', color='red', linestyle='--')
        ax.fill_between(df.index, upper_band, lower_band, alpha=0.1, color='gray')
        
        ax.set_title(f'Bollinger Bands ({window}-day window)')
        ax.set_xlabel('Time')
        ax.set_ylabel('Price')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_momentum_indicators(prices: np.ndarray,ax: plt.Axes, window: int = 14) -> None:
        """Plot RSI and MACD indicators."""
        df = pd.DataFrame({'price': prices})
        
        # Calculate RSI
        delta = df['price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # Calculate MACD
        exp1 = df['price'].ewm(span=12, adjust=False).mean()
        exp2 = df['price'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        
        # Create twin axis for different scales
        ax2 = ax.twinx()
        
        # Plot RSI
        ax.plot(rsi, label='RSI', color='purple')
        ax.axhline(y=70, color='r', linestyle='--', alpha=0.5)
        ax.axhline(y=30, color='g', linestyle='--', alpha=0.5)
        
        # Plot MACD
        ax2.plot(macd, label='MACD', color='blue')
        ax2.plot(signal, label='Signal', color='orange')
        
        ax.set_title('Momentum Indicators')
        ax.set_xlabel('Time')
        ax.set_ylabel('RSI')
        ax2.set_ylabel('MACD')
        
        # Combine legends
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left')
        
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_correlation_matrix(df: pd.DataFrame, ax: plt.Axes) -> None:
        """Plot correlation matrix of features."""
        corr = df.corr()
        sns.heatmap(corr, annot=True, cmap='coolwarm', center=0, ax=ax)
        ax.set_title('Feature Correlation Matrix')
        plt.xticks(rotation=45)
        plt.yticks(rotation=45)

    @staticmethod
    @create_plot
    def plot_volume_profile(df: pd.DataFrame,ax: plt.Axes, n_bins: int = 50) -> None:
        """Plot volume profile."""
        # Calculate price bins and volume distribution
        price_bins = np.linspace(df['Close'].min(), df['Close'].max(), n_bins)
        volume_profile = np.zeros(n_bins - 1)
        
        for i in range(len(price_bins) - 1):
            mask = (df['Close'] >= price_bins[i]) & (df['Close'] < price_bins[i + 1])
            volume_profile[i] = df.loc[mask, 'Volume'].sum()
        
        # Normalize volume profile
        volume_profile = volume_profile / volume_profile.max()
        
        # Plot horizontal volume bars
        ax.barh(price_bins[:-1], volume_profile, height=np.diff(price_bins)[0], 
                alpha=0.3, color='blue')
        ax.plot(df['Close'], color='black', alpha=0.7, label='Price')
        
        ax.set_title('Volume Profile')
        ax.set_xlabel('Relative Volume')
        ax.set_ylabel('Price')
        ax.legend()
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_drawdown(prices: np.ndarray, ax: plt.Axes) -> None:
        """Plot price drawdown analysis."""
        # Calculate running maximum
        running_max = np.maximum.accumulate(prices)
        drawdown = (prices - running_max) / running_max * 100
        
        ax.plot(drawdown, color='red', label='Drawdown')
        ax.fill_between(range(len(drawdown)), drawdown, 0, color='red', alpha=0.3)
        
        ax.set_title('Price Drawdown Analysis')
        ax.set_xlabel('Time')
        ax.set_ylabel('Drawdown (%)')
        ax.grid(True)

    @staticmethod
    @create_plot
    def plot_prediction_error_by_volatility(y_true: np.ndarray, y_pred: np.ndarray, ax: plt.Axes,
                                          prices: np.ndarray, window: int = 20) -> None:
        """Plot prediction error vs volatility."""
        try:
            # Ensure arrays have the same length
            min_length = min(len(y_true), len(y_pred), len(prices))
            y_true = y_true[:min_length]
            y_pred = y_pred[:min_length]
            prices = prices[:min_length]
            
            # Calculate volatility
            returns = np.diff(prices) / prices[:-1]
            volatility = pd.Series(returns).rolling(window=window).std() * np.sqrt(252)
            
            # Calculate prediction errors
            errors = np.abs(y_true - y_pred)
            
            # Remove NaN values from volatility calculation
            valid_idx = ~np.isnan(volatility)
            volatility = volatility[valid_idx]
            errors = errors[valid_idx]
            
            # Ensure we have enough data points
            if len(volatility) < 2 or len(errors) < 2:
                ax.text(0.5, 0.5, 'Insufficient data for volatility analysis', 
                       ha='center', va='center', transform=ax.transAxes)
                ax.set_title('Prediction Error vs Volatility')
                return
            
            # Plot scatter
            ax.scatter(volatility, errors, alpha=0.5)
            
            # Add trend line
            z = np.polyfit(volatility, errors, 1)
            p = np.poly1d(z)
            ax.plot(volatility, p(volatility), "r--", alpha=0.8, 
                    label=f'Trend (slope: {z[0]:.2f})')
            
            ax.set_title('Prediction Error vs Volatility')
            ax.set_xlabel('Volatility')
            ax.set_ylabel('Absolute Prediction Error')
            ax.legend()
            ax.grid(True)
        except Exception as e:
            ax.text(0.5, 0.5, f'Error: {str(e)}', 
                   ha='center', va='center', transform=ax.transAxes)
            ax.set_title('Prediction Error vs Volatility')
