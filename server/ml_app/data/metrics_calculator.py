import structlog
import numpy as np
from sklearn.metrics import mean_squared_error, r2_score
from typing import Dict

class MetricsCalculator:
    logger = structlog.get_logger(__name__)

    @classmethod
    def calculate_metrics(cls, y_true: np.ndarray, y_pred: np.ndarray,
                         mean: np.ndarray, std: np.ndarray) -> Dict[str, float]:
        """
        Calculate prediction metrics with support for multi-feature normalization.
        
        Args:
            y_true: True values
            y_pred: Predicted values
            mean: Mean values used for normalization (can be scalar or array)
            std: Standard deviation values used for normalization (can be scalar or array)
            
        Returns:
            Dictionary containing various metrics
        """
        # Handle both single-feature and multi-feature normalization
        if isinstance(mean, (int, float)) and isinstance(std, (int, float)):
            # Single feature (backward compatibility)
            y_true_denorm = y_true * std + mean
            y_pred_denorm = y_pred * std + mean
        else:
            # Multi-feature: use the close price normalization (last feature)
            if isinstance(mean, np.ndarray) and isinstance(std, np.ndarray):
                close_mean = mean[-1] if len(mean.shape) > 0 else mean
                close_std = std[-1] if len(std.shape) > 0 else std
            else:
                close_mean = mean
                close_std = std
            y_true_denorm = y_true * close_std + close_mean
            y_pred_denorm = y_pred * close_std + close_mean

        # Calculate metrics
        mae = np.mean(np.abs(y_true_denorm - y_pred_denorm))
        mse = mean_squared_error(y_true_denorm, y_pred_denorm)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_true_denorm, y_pred_denorm)

        # Calculate MAPE (Mean Absolute Percentage Error)
        # Avoid division by zero
        mape = np.mean(np.abs((y_true_denorm - y_pred_denorm) / np.where(y_true_denorm != 0, y_true_denorm, 1))) * 100

        metrics = {
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2),
            'mape': float(mape),
            'mse': float(mse)
        }

        cls.logger.info("metrics_calculated", **metrics)
        return metrics

