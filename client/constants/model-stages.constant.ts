export enum ModelStages {
  PARAMETERS = "PARAMETERS",
  TRAINING = "TRAINING",
  EVALUATING = "EVALUATING",
  VISUALIZING = "VISUALIZING",
  PREDICTING = "PREDICTING",
  RESULTS = "RESULTS",
}

export const MODEL_STAGE_LABELS: Record<ModelStages, string> = {
  [ModelStages.PARAMETERS]: "Configuration",
  [ModelStages.TRAINING]: "Model Training",
  [ModelStages.EVALUATING]: "Performance Analysis",
  [ModelStages.VISUALIZING]: "Data Visualization",
  [ModelStages.PREDICTING]: "Making Predictions",
  [ModelStages.RESULTS]: "Final Results",
};

export const STAGE_TRANSITIONS: Record<ModelStages, ModelStages> = {
  [ModelStages.PARAMETERS]: ModelStages.TRAINING,
  [ModelStages.TRAINING]: ModelStages.EVALUATING,
  [ModelStages.EVALUATING]: ModelStages.VISUALIZING,
  [ModelStages.VISUALIZING]: ModelStages.PREDICTING,
  [ModelStages.PREDICTING]: ModelStages.RESULTS,
  [ModelStages.RESULTS]: ModelStages.RESULTS,
};
