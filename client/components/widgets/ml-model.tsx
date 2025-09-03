"use client";

import { useState, useEffect } from "react";
import { 
  Brain, BarChart3, Database, Settings, Zap, Layers, Eye, 
  CheckCircle, Loader2, Play, Target, TrendingUp, ArrowRight,
  Wifi, WifiOff, RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/lib/websocket";
import { useConnectionHealth } from "@/hooks/use-connection-health";
import { ModelTrainingForm } from "@/components/forms/model-training-form";
import { PredictionForm } from "@/components/forms/prediction-form";
import ApiService from "@/lib/api";
import { ResultsCard } from "@/components/ui/results-card";
import type { 
  TrainingUpdateEvent, 
  TrainingStage, 
  TrainingConfig, 
  TrainingRequest, 
  PredictionResponse,
  TrainingProgressData
} from "@/types/socket";
import { Widget } from "../ui/widget";

interface TrainingData {
  [key: string]: Record<string, unknown> | string | number | null | undefined;
}

interface TrainingStats {
  final_accuracy?: number;
  final_loss?: number;
  r2_score?: number;
  mae?: number;
  rmse?: number;
  mape?: number;
}

type MLStep = 'training-form' | 'training-progress' | 'training-complete' | 'prediction-form' | 'prediction-results';

export default function MachineLearningWidget() {
  const {
    isConnected,
    isConnecting,
    error: _wsError,
    reconnect,
    onTrainingUpdate,
    joinTrainingRoom,
    leaveTrainingRoom,
  } = useWebSocket();

  const { health } = useConnectionHealth();

  // State management
  const [currentStep, setCurrentStep] = useState<MLStep>('training-form');
  const [currentStage, setCurrentStage] = useState<TrainingStage>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [trainingData, setTrainingData] = useState<TrainingData>({});
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({});
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig | null>(null);

  // Listen for training updates
  useEffect(() => {
    const unsubscribe = onTrainingUpdate((data: TrainingUpdateEvent) => {
      console.log('ML Widget received training update:', data);

      const { type, progress: stageProgress, data: stageData, session_id } = data;

      // Update current stage
      if (type && type !== 'training_update') {
        setCurrentStage(type);
      }

      // Update progress
      if (stageProgress !== undefined) {
        setProgress(stageProgress);
      }

      // Store training data
      if (type && stageData) {
        setTrainingData((prev: TrainingData) => ({
          ...prev,
          [type]: stageData as Record<string, unknown>
        }));
      }

      // Track session
      if (session_id && activeSession !== session_id) {
        setActiveSession(session_id);
        joinTrainingRoom(session_id);
      }

      // Handle training completion
      if (type === 'training_completed' || type === 'training_complete') {
        setIsTraining(false);
        setCurrentStep('training-complete');
        
        // Extract final stats
        const stats: TrainingStats = {};
        if (data.final_accuracy !== undefined) stats.final_accuracy = data.final_accuracy;
        if (data.final_loss !== undefined) stats.final_loss = data.final_loss;
        if (data.r2_score !== undefined) stats.r2_score = data.r2_score;
        if (data.mae !== undefined) stats.mae = data.mae;
        if (data.rmse !== undefined) stats.rmse = data.rmse;
        if (data.mape !== undefined) stats.mape = data.mape;
        setTrainingStats(stats);
      } else if (type && type !== 'idle' && currentStep === 'training-form') {
        setIsTraining(true);
        setCurrentStep('training-progress');
      }
    });

    return () => {
      unsubscribe?.();
      if (activeSession) {
        leaveTrainingRoom(activeSession);
      }
    };
  }, [onTrainingUpdate, joinTrainingRoom, leaveTrainingRoom, activeSession, currentStep]);

  const getStageIcon = (stage: TrainingStage) => {
    switch (stage) {
      case 'data_fetching':
      case 'data_fetched':
        return <Database className="h-3 w-3" />;
      case 'preprocessing':
        return <Settings className="h-3 w-3" />;
      case 'feature_engineering':
        return <Zap className="h-3 w-3" />;
      case 'model_building':
      case 'model_info':
        return <Layers className="h-3 w-3" />;
      case 'training_update':
      case 'training_progress':
        return <Brain className="h-3 w-3" />;
      case 'evaluating_update':
        return <BarChart3 className="h-3 w-3" />;
      case 'visualizing_update':
        return <Eye className="h-3 w-3" />;
      default:
        return <Brain className="h-3 w-3" />;
    }
  };

  const getStageDisplayName = (stage: TrainingStage) => {
    const stageNames: Record<TrainingStage, string> = {
      'data_fetching': 'Fetching Data',
      'data_fetched': 'Data Fetched',
      'preprocessing': 'Preprocessing',
      'feature_engineering': 'Feature Engineering',
      'model_building': 'Building Model',
      'model_info': 'Model Info',
      'training_update': 'Training',
      'training_progress': 'Training',
      'evaluating_update': 'Evaluating',
      'visualizing_update': 'Generating Visualizations',
      'idle': 'Idle',
      'starting': 'Starting...',
      'training_started': 'Training Started',
      'training_completed': 'Training Completed',
      'training_complete': 'Training Complete'
    };
    return stageNames[stage] || stage;
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(4);
  };

  const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };

  const handleStartTraining = async (formData: TrainingConfig) => {
    try {
      setTrainingConfig(formData);
      setIsTraining(true);
      setPredictionResult(null);
      setCurrentStep('training-progress');
      
      const response = await ApiService.startTraining({
        ticker: formData.ticker,
        model_type: formData.modelType as TrainingRequest['model_type'],
        start_date: formData.startDate,
        end_date: formData.endDate,
        lookback: formData.lookback,
        epochs: formData.epochs,
        batch_size: formData.batchSize,
        learning_rate: formData.learningRate,
      });
      
      if (response?.session_id) {
        setActiveSession(response.session_id);
        joinTrainingRoom(response.session_id);
      }
    } catch (e) {
      console.error('Failed to start training', e);
      setIsTraining(false);
      setCurrentStep('training-form');
    }
  };

  const handleStartPrediction = () => {
    setCurrentStep('prediction-form');
  };

  const handlePredictionSubmit = async (data: { startDate: string; days: number }) => {
    try {
      setIsPredicting(true);
      const result = await ApiService.getPrediction({
        ticker: 'ETH-USD',
        start_date: data.startDate,
        days: Number(data.days),
      });
      setPredictionResult(result as unknown as PredictionResponse);
      setCurrentStep('prediction-results');
    } catch (e) {
      console.error('Prediction failed', e);
    } finally {
      setIsPredicting(false);
    }
  };

  const resetToTraining = () => {
    setCurrentStep('training-form');
    setTrainingData({});
    setTrainingStats({});
    setPredictionResult(null);
    setActiveSession(null);
    setIsTraining(false);
    setIsPredicting(false);
  };

  // Connection Status Component
  const ConnectionStatus = () => (
    <div className="flex items-center gap-1 p-1 rounded border bg-background/50">
      {isConnected ? (
        <Wifi className="h-2 w-2 text-green-500" />
      ) : (
        <WifiOff className="h-2 w-2 text-red-500" />
      )}
      <span className="text-xs">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {!isConnected && !isConnecting && (
        <Button
          variant="outline"
          size="sm"
          onClick={reconnect}
          className="h-4 px-1 text-xs"
        >
          <RefreshCw className="h-2 w-2 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );

  return (
    <Widget 
      title="ML Model"
      headerContent={<ConnectionStatus />}
      fullHeight={true}
    >
      <div className="h-full flex flex-col">
        {/* Step Indicator - Minimal */}
        <div className="flex items-center gap-1 p-1 border-b bg-muted/30 mb-2">
          {['training-form', 'training-progress', 'training-complete', 'prediction-form', 'prediction-results'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center gap-1 px-1 py-0.5 rounded-full text-xs ${
                currentStep === step 
                  ? 'bg-primary text-primary-foreground' 
                  : index < ['training-form', 'training-progress', 'training-complete', 'prediction-form', 'prediction-results'].indexOf(currentStep)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < 4 && <ArrowRight className="h-2 w-2 text-muted-foreground mx-0.5" />}
            </div>
          ))}
        </div>

        {/* Content Area - Takes remaining height */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'training-form' && (
            <div className="h-full">
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Configure Training</span>
              </div>
              <div className="h-[calc(100%-2rem)]">
                <ModelTrainingForm
                  isTraining={false}
                  onStartTraining={handleStartTraining}
                />
              </div>
            </div>
          )}

          {currentStep === 'training-progress' && (
            <div className="h-full space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Training in Progress</span>
              </div>
              {trainingConfig && (
                <div className="text-xs text-muted-foreground">
                  {trainingConfig.modelType} model for {trainingConfig.ticker}
                </div>
              )}

              {/* Current Stage */}
              <div className="flex items-center gap-2 p-2 border rounded">
                {getStageIcon(currentStage)}
                <div className="flex-1">
                  <div className="text-xs font-medium">{getStageDisplayName(currentStage)}</div>
                  <div className="text-xs text-muted-foreground">Current stage</div>
                </div>
                {isTraining && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full h-1.5" />
              </div>

              {/* Training Metrics */}
              {trainingData.training_progress && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 border rounded">
                    <div className="text-xs text-muted-foreground">Epoch</div>
                    <div className="text-sm font-semibold">
                      {(trainingData.training_progress as unknown as TrainingProgressData).epoch || 0}
                    </div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                    <div className="text-sm font-semibold">
                      {formatPercentage((trainingData.training_progress as unknown as TrainingProgressData).accuracy)}
                    </div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-xs text-muted-foreground">Loss</div>
                    <div className="text-sm font-semibold">
                      {formatNumber((trainingData.training_progress as unknown as TrainingProgressData).loss)}
                    </div>
                  </div>
                  <div className="text-center p-2 border rounded">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-sm font-semibold">
                      {(trainingData.training_progress as unknown as TrainingProgressData).total_epochs || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'training-complete' && (
            <div className="h-full space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Training Complete</span>
              </div>

              {/* Training Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 border rounded bg-green-50">
                  <div className="text-xs text-muted-foreground">Final Accuracy</div>
                  <div className="text-sm font-bold text-green-600">
                    {formatPercentage(trainingStats.final_accuracy)}
                  </div>
                </div>
                <div className="text-center p-2 border rounded bg-blue-50">
                  <div className="text-xs text-muted-foreground">Final Loss</div>
                  <div className="text-sm font-bold text-blue-600">
                    {formatNumber(trainingStats.final_loss)}
                  </div>
                </div>
                {trainingStats.r2_score && (
                  <div className="text-center p-2 border rounded bg-purple-50">
                    <div className="text-xs text-muted-foreground">R² Score</div>
                    <div className="text-sm font-bold text-purple-600">
                      {formatNumber(trainingStats.r2_score)}
                    </div>
                  </div>
                )}
                {trainingStats.mae && (
                  <div className="text-center p-2 border rounded bg-orange-50">
                    <div className="text-xs text-muted-foreground">MAE</div>
                    <div className="text-sm font-bold text-orange-600">
                      {formatNumber(trainingStats.mae)}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleStartPrediction} className="flex-1 text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Make Prediction
                </Button>
                <Button variant="outline" onClick={resetToTraining} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  New Model
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'prediction-form' && (
            <div className="h-full">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Make Prediction</span>
              </div>
              <div className="h-[calc(100%-2rem)]">
                <PredictionForm
                  isPredicting={isPredicting}
                  onSubmit={handlePredictionSubmit}
                />
              </div>
            </div>
          )}

          {currentStep === 'prediction-results' && (
            <div className="h-full space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Prediction Results</span>
              </div>
              <div className="flex-1 overflow-auto">
                  {predictionResult && <ResultsCard predictions={predictionResult as unknown as PredictionResponse} />}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStartPrediction} variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  New Prediction
                </Button>
                <Button onClick={resetToTraining} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Start Over
                </Button>
              </div>
            </div>
          )}

          {/* Server Health */}
          {health && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              Server: {health.quality} • Score: {health.score}/100
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}
