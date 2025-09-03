"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  Brain, 
  BarChart3, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Zap,
  Layers,
  Settings,
  Eye
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket";

export interface TrainingProgressProps {
  sessionId: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

export function TrainingProgress({ sessionId, onComplete, onError }: TrainingProgressProps) {
  const { isConnected, joinTrainingRoom, leaveTrainingRoom, onTrainingUpdate } = useWebSocket();
  const [currentStage, setCurrentStage] = useState<string>('data_fetching');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [trainingData, setTrainingData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  // Join training room when component mounts
  useEffect(() => {
    if (isConnected && sessionId) {
      joinTrainingRoom(sessionId);
      return () => leaveTrainingRoom(sessionId);
    }
  }, [isConnected, sessionId, joinTrainingRoom, leaveTrainingRoom]);

  // Listen for training updates
  useEffect(() => {
    const cleanup = onTrainingUpdate((data) => {
      console.log('Training update received:', data);
      
      const { type, message: updateMessage, progress: updateProgress, data: stageData } = data;
      
      // Update current stage and progress
      if (type) {
        setCurrentStage(type);
      }
      
      if (updateProgress !== undefined) {
        setProgress(updateProgress);
      }
      
      if (updateMessage) {
        setMessage(updateMessage);
      }
      
      // Store training data
      if (stageData) {
        setTrainingData(prev => ({
          ...prev,
          [type]: stageData
        }));
      }
      
      // Handle completion
      if (type === 'visualizing_update' && stageData?.plots) {
        onComplete?.(stageData);
      }
      
      // Handle errors
      if (data.error) {
        setError(data.error);
        onError?.(data.error);
      }
    });

    return cleanup;
  }, [onTrainingUpdate, onComplete, onError]);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'data_fetching':
      case 'data_fetched':
        return <Database className="h-4 w-4" />;
      case 'preprocessing':
        return <Settings className="h-4 w-4" />;
      case 'feature_engineering':
        return <Zap className="h-4 w-4" />;
      case 'model_building':
      case 'model_info':
        return <Layers className="h-4 w-4" />;
      case 'training_update':
        return <Brain className="h-4 w-4" />;
      case 'evaluating_update':
        return <BarChart3 className="h-4 w-4" />;
      case 'visualizing_update':
        return <Eye className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStageName = (stage: string) => {
    switch (stage) {
      case 'data_fetching':
        return 'Data Fetching';
      case 'data_fetched':
        return 'Data Retrieved';
      case 'preprocessing':
        return 'Preprocessing';
      case 'feature_engineering':
        return 'Feature Engineering';
      case 'model_building':
        return 'Model Building';
      case 'model_info':
        return 'Model Ready';
      case 'training_update':
        return 'Training';
      case 'evaluating_update':
        return 'Evaluating';
      case 'visualizing_update':
        return 'Visualizing';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Training Progress
            <Badge variant="outline" className="ml-auto">
              {progress}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3 mb-4" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Session: {sessionId}</span>
            <span>Current: {getStageName(currentStage)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Stage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              {getStageIcon(currentStage)}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">{getStageName(currentStage)}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <div className="flex items-center gap-2">
              {progress < 100 ? (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <Badge variant="outline" className="text-xs">
                {progress}%
              </Badge>
            </div>
          </div>
          
          {progress > 0 && (
            <Progress value={progress} className="h-2 mt-3" />
          )}
        </CardContent>
      </Card>

      {/* Training Data Display */}
      {Object.keys(trainingData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trainingData.data_fetched && (
                <div>
                  <h4 className="font-medium mb-2">Data Pipeline</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                      <div className="font-bold">{trainingData.data_fetched.rows}</div>
                      <div className="text-muted-foreground">Rows</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
                      <div className="font-bold">{trainingData.data_fetched.train_samples}</div>
                      <div className="text-muted-foreground">Train</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                      <div className="font-bold">{trainingData.data_fetched.test_samples}</div>
                      <div className="text-muted-foreground">Test</div>
                    </div>
                  </div>
                </div>
              )}
              
              {trainingData.training_update && (
                <div>
                  <h4 className="font-medium mb-2">Training Metrics</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="font-bold">{trainingData.training_update.epoch}/{trainingData.training_update.total_epochs}</div>
                      <div className="text-muted-foreground">Epoch</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="font-bold">{trainingData.training_update.loss?.toFixed(4) || 'N/A'}</div>
                      <div className="text-muted-foreground">Loss</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Training failed: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Completion Status */}
      {currentStage === 'visualizing_update' && progress === 100 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Model training completed successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
