export type PredictionResponse = {
  request_id: string;
  status: string;
  data: {
    predictions: {
      confidence_interval: number;
      day: number;
      lower_bound: number;
      predicted_price: number;
      timestamp: string;
      upper_bound: number;
      volatility_factor: number;
    }[];
    model_config: {
      batch_size: number;
      epochs: number;
      lookback: number;
      model: string;
      random_seed: number;
      ticker: string;
      train_test_split: number;
    };
    data_range: {
      start_date: string;
      end_date: string;
      prediction_start: string;
    };
  };
};
