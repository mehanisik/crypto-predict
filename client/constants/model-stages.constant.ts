import { StageConfig } from "@/types/stages";
import { TaskStage } from "./task-stage.constant";

export const STAGES: StageConfig[] = [
  {
    id: TaskStage.DataFetch,
    label: "Data Fetching",
    icon: "refresh-ccw",
    description: "Retrieving historical price data",
  },
  {
    id: TaskStage.Preprocessing,
    label: "Preprocessing",
    icon: "settings",
    description: "Cleaning and preparing the data",
  },
  {
    id: TaskStage.FeatureEngineering,
    label: "Feature Engineering",
    icon: "sliders-horizontal",
    description: "Creating advanced indicators",
  },
  {
    id: TaskStage.Training,
    label: "Model Training",
    icon: "roller-coaster",
    description: "Training the AI model",
  },
  {
    id: TaskStage.Evaluation,
    label: "Model Evaluation",
    icon: "clipboard",
    description: "Evaluating the model performance",
  },
];
