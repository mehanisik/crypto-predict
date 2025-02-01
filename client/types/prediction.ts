export interface PredictionResponse {
  data: {
    data_range: {
      end_date: string;
      prediction_start: string;
      start_date: string;
    };
    model_config: {
      batch_size: number;
      epochs: number;
      lookback: number;
      model: string;
      random_seed: number;
      ticker: string;
      train_test_split: number;
    };
    predictions: Array<{
      confidence_interval: number;
      day: number;
      lower_bound: number;
      predicted_price: number;
      timestamp: string;
      upper_bound: number;
      volatility_factor: number;
    }>;
  };
  request_id: string;
  status: string;
}
