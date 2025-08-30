"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  BarChart3, 
  Eye, 
  Target, 
  CheckCircle, 
  Clock,
  Play,
  Pause
} from "lucide-react";
import { useModelSocket } from "@/hooks/use-socket";
import { ModelStages, MODEL_STAGE_LABELS } from "@/constants/model-stages.constant";

interface ModelProgressIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ModelProgressIndicator({ className = "", showDetails = false }: ModelProgressIndicatorProps) {
  const {
    currentStage,
    currentProgress,
    progressData,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useModelSocket();

  const getStageIcon = (stage: ModelStages) => {
    switch (stage) {
      case ModelStages.PARAMETERS:
        return <Brain className="h-4 w-4" />;
      case ModelStages.TRAINING:
        return <Play className="h-4 w-4" />;
      case ModelStages.EVALUATING:
        return <BarChart3 className="h-4 w-4" />;
      case ModelStages.VISUALIZING:
        return <Eye className="h-4 w-4" />;
      case ModelStages.PREDICTING:
        return <Target className="h-4 w-4" />;
      case ModelStages.RESULTS:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: ModelStages) => {
    switch (stage) {
      case ModelStages.PARAMETERS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ModelStages.TRAINING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ModelStages.EVALUATING:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case ModelStages.VISUALIZING:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case ModelStages.PREDICTING:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ModelStages.RESULTS:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStageProgress = (stage: ModelStages): number => {
    if (stage === currentStage) {
      return currentProgress;
    }

    const stageOrder = Object.values(ModelStages);
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);

    if (currentIndex > stageIndex) {
      return 100; // Stage completed
    }
    return 0; // Stage not started
  };

  const getConnectionStatusColor = () => {
    if (isConnected) return 'bg-green-100 text-green-800 border-green-200';
    if (isConnecting) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (isReconnecting) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConnectionStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (isReconnecting) return 'Reconnecting...';
    return 'Disconnected';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          {getStageIcon(currentStage)}
          <span className="text-sm font-medium">{MODEL_STAGE_LABELS[currentStage]}</span>
        </div>
        
        <Badge variant="outline" className={getStageColor(currentStage)}>
          {currentProgress}%
        </Badge>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <Badge variant="outline" className={getConnectionStatusColor()}>
            {getConnectionStatusText()}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Model Training Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Current Stage</h3>
            <Badge variant="outline" className={getStageColor(currentStage)}>
              {currentProgress}%
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {getStageIcon(currentStage)}
            <span className="font-medium">{MODEL_STAGE_LABELS[currentStage]}</span>
          </div>
          
          <Progress value={currentProgress} className="h-2" />
        </div>

        {/* All Stages Progress */}
        <div className="space-y-4">
          <h3 className="font-medium">Stage Progress</h3>
          <div className="space-y-3">
            {Object.values(ModelStages).map((stage) => {
              const progress = getStageProgress(stage);
              const isCurrent = stage === currentStage;
              const isCompleted = progress === 100;
              
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStageIcon(stage)}
                      <span className="text-sm">{MODEL_STAGE_LABELS[stage]}</span>
                      {isCurrent && (
                        <Badge variant="outline" size="sm" className="bg-blue-100 text-blue-800">
                          Active
                        </Badge>
                      )}
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-1.5" 
                    variant={isCurrent ? "default" : "secondary"}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-3">
          <h3 className="font-medium">Connection Status</h3>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-blue-500' : isReconnecting ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <Badge variant="outline" className={getConnectionStatusColor()}>
              {getConnectionStatusText()}
            </Badge>
          </div>
        </div>

        {/* Progress Data Summary */}
        {Object.keys(progressData).length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Progress Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {progressData.training && (
                <div className="p-2 bg-blue-50 rounded border">
                  <p className="font-medium text-blue-800">Training</p>
                  <p className="text-blue-600">{progressData.training.data.progress}% complete</p>
                </div>
              )}
              {progressData.evaluating && (
                <div className="p-2 bg-purple-50 rounded border">
                  <p className="font-medium text-purple-800">Evaluating</p>
                  <p className="text-purple-600">{progressData.evaluating.data.progress}% complete</p>
                </div>
              )}
              {progressData.visualizing && (
                <div className="p-2 bg-indigo-50 rounded border">
                  <p className="font-medium text-indigo-800">Visualizing</p>
                  <p className="text-indigo-600">{progressData.visualizing.data.progress}% complete</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
