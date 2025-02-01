import structlog
import numpy as np
from sklearn.metrics import mean_squared_error, r2_score
from typing import Dict

class MetricsCalculator:
    logger = structlog.get_logger(__name__)

    @classmethod
    def calculate_metrics(cls, y_true: np.ndarray, y_pred: np.ndarray, 
                         mean: float, std: float) -> Dict[str, float]:
        y_true_denorm = y_true * std + mean
        y_pred_denorm = y_pred * std + mean
        
        mae = np.mean(np.abs(y_true_denorm - y_pred_denorm))
        mse = mean_squared_error(y_true_denorm, y_pred_denorm)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_true_denorm, y_pred_denorm)
        mape = np.mean(np.abs((y_true_denorm - y_pred_denorm) / y_true_denorm)) * 100
        
        metrics = {
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2),
            'mape': float(mape),
            'mse': float(mse)
        }
        
        cls.logger.info("metrics_calculated", **metrics)
        return metrics
    
