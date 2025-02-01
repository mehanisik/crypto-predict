export interface TrainingUpdateResponse {
  type: "training_update";
  data: {
    epoch: number;
    total_epochs: number;
    loss: number;
    val_loss: number;
    progress: number;
  };
  timestamp: string;
}
