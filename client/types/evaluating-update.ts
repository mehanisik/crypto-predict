export interface EvaluatingUpdateResponse {
  type: "evaluating_update";
  data: {
    metrics: {
      train: {
        mae: number;
        rmse: number;
        r2: number;
        mape: number;
      };
      test: {
        mae: number;
        rmse: number;
        r2: number;
        mape: number;
      };
    };
    progress: number;
  };
  timestamp: string;
}
