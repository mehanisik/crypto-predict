import { MetricsData } from "@/types/metrics-data";

export interface TrainingResponse {
  train_metrics: MetricsData;
  test_metrics: MetricsData;
  plots: {
    prediction_plot: string;
    training_history: string;
    residual_plot: string;
    qq_plot: string;
    error_distribution: string;
    actual_vs_predicted: string;
    rolling_stats: string;
  };
  history: {
    loss: number[];
    val_loss: number[];
  };
}
