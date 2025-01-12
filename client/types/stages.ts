import { TaskStage } from "@/constants/task-stage.constant";
import dynamicIconImports from "lucide-react/dynamicIconImports";

export interface StageConfig {
  id: TaskStage;
  label: string;
  icon: keyof typeof dynamicIconImports;
  description: string;
}
