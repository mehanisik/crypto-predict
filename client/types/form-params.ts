export interface FormParams {
  ticker: string;
  modelType: "CNN" | "LSTM" | "CNN-LSTM" | "LSTM-CNN";
  startDate: string;
  endDate: string;
  lookback?: number;
  epochs?: number;
  batchSize?: number;
}
