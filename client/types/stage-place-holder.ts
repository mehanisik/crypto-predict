import { ModelStages } from "@/constants/model-stages.constant";

export interface StagePlaceholderProps {
  stage: ModelStages;
  isComplete: boolean;
  currentStage: ModelStages;
  className?: string;
}
