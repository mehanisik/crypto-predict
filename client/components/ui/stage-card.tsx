import React from "react";
import { StageConfig } from "@/types/stages";
import Icon from "./icons";

const StageCard: React.FC<{ stage: StageConfig; isActive: boolean }> = ({
  stage,
  isActive,
}) => (
  <div
    className={`p-4 rounded-lg transition-all duration-200 ${
      isActive
        ? "bg-primary text-primary-foreground shadow-lg"
        : "bg-card hover:bg-accent"
    }`}
  >
    <div className="flex items-center space-x-3">
      <Icon name={stage.icon} className="h-4 w-4" />
      <div>
        <h3 className="font-medium">{stage.label}</h3>
        <p className="text-sm opacity-90">{stage.description}</p>
      </div>
    </div>
  </div>
);

export { StageCard };
