"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Clock, LoaderPinwheel, RefreshCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useModelSocket } from "@/hooks/use-socket";
import { useConnectionHealth } from "@/hooks/use-connection-health";
import { useMutation } from "@tanstack/react-query";
import { FormParams } from "@/types/form-params";
import {
  MODEL_STAGE_LABELS,
  ModelStages,
} from "@/constants/model-stages.constant";
import server from "@/lib/axios";
import { Widget } from "../ui/widget";
import ModelTrainingForm from "../forms/model-training-form";
import { Button } from "../ui/button";
import { PlotGrid } from "../charts/plot-grid";
import { PredictionForm } from "../forms/prediction-form";
import { PredictionResponse } from "@/types/prediction";
import { ResultsCard } from "../ui/results-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SelectedParams = {
  modelType: string;
  ticker: string;
} | null;

export default function MachineLearningWidget() {
  const {
    isConnected,
    error,
    progressData,
    currentStage,
    currentProgress,
    resetState,
    setCurrentStage,
    isStageComplete,
  } = useModelSocket();

  const { health } = useConnectionHealth();

  const [activeTab, setActiveTab] = useState<string>(currentStage.toString());
  const [selectedParams, setSelectedParams] = useState<SelectedParams>(null);
  const [predictionsData, setPredictionsData] = useState<PredictionResponse>();

  useEffect(() => {
    setActiveTab(currentStage.toString());
  }, [currentStage]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormParams) => {
      console.log('Starting training with data:', data);
      setSelectedParams({
        modelType: data.modelType,
        ticker: data.ticker,
      });
      
      try {
        const response = await server.post("/train", {
          ticker: data.ticker,
          start_date: data.startDate,
          end_date: data.endDate,
          lookback: data.lookback,
          epochs: data.epochs,
          model: data.modelType,
        });
        console.log('Training response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Training error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Training started successfully:', data);
      setCurrentStage(ModelStages.TRAINING);
      // Show success message
      alert('Training started successfully! Check the training tab for progress.');
    },
    onError: (error: any) => {
      console.error('Training failed:', error);
      // Show error message to user
      const errorMessage = error?.response?.data?.message || error?.message || 'Training failed. Please try again.';
      alert(`Training failed: ${errorMessage}`);
    },
  });

  const { mutate: predict, isPending: isPredicting } = useMutation({
    mutationFn: async (data: { startDate: string; days: number }) => {
      const response = await server.post("/predict", {
        start_date: data.startDate,
        days: data.days,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentStage(ModelStages.RESULTS);
      setPredictionsData(data);
    },
  });

  const isComplete = isStageComplete(ModelStages.VISUALIZING);

  function StagePlaceholder({
    stage,
    isComplete,
    currentStage,
  }: {
    stage: ModelStages;
    isComplete: boolean;
    currentStage: ModelStages;
  }) {
    return (
      <div className="flex flex-col items-center justify-center h-[180px] space-y-4">
        <Clock className="h-12 w-12 text-muted-foreground animate-pulse" />
        <p className="text-sm text-muted-foreground text-center">
          {isComplete
            ? `${MODEL_STAGE_LABELS[stage]} completed`
            : currentStage === stage
            ? `${MODEL_STAGE_LABELS[stage]} in progress...`
            : `Waiting for ${MODEL_STAGE_LABELS[stage]} to start`}
        </p>
      </div>
    );
  }

  return (
    <Widget
      title="Model Progress"
      headerContent={
        <div className="flex items-center gap-4">
          {/* Ultra Minimalist Progress Stepper */}
          <div className="flex items-center">
            {Object.values(ModelStages).map((stage, index) => {
              const isActive = currentStage === stage;
              const isCompleted = isStageComplete(stage);
              
              return (
                <div key={stage} className="flex items-center">
                  {/* Minimal Step */}
                  <div className={`px-2 py-1 text-xs font-medium transition-colors duration-200 ${
                    isCompleted 
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30' 
                      : isActive 
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30' 
                      : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  
                  {/* Minimal Label */}
                  <span className={`ml-1 text-xs font-medium transition-colors duration-200 ${
                    isCompleted 
                      ? 'text-green-600 dark:text-green-400' 
                      : isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {MODEL_STAGE_LABELS[stage]}
                  </span>
                  
                  {/* Minimal Connector */}
                  {index < Object.values(ModelStages).length - 1 && (
                    <div className={`mx-2 w-3 h-px ${
                      isCompleted ? 'bg-green-300 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Enhanced WebSocket Connection Status */}
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isConnected ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'
              }`} />
              <span className={`text-xs font-medium transition-colors duration-300 ${
                isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Connection Health Badge */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                health.score >= 80 ? 'bg-green-500 dark:bg-green-400' : 
                health.score >= 60 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-red-500 dark:bg-red-400'
              }`} />
              <Badge 
                variant="outline" 
                className={`text-xs border-0 px-2 py-0.5 ${
                  health.score >= 80 ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' : 
                  health.score >= 60 ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}
              >
                {health.score}/100
              </Badge>
            </div>

            {/* Connection Quality Indicator */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Quality:</span>
              <span className={`text-xs font-medium capitalize ${
                health.quality === 'excellent' ? 'text-green-600 dark:text-green-400' :
                health.quality === 'good' ? 'text-blue-600 dark:text-blue-400' :
                health.quality === 'fair' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {health.quality}
              </span>
            </div>

            {/* Quick Status Summary */}
            {!isConnected && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {error ? 'Connection Error' : 'Reconnecting...'}
                </span>
              </div>
            )}
          </div>
          
          {isComplete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={resetState}
              className="animate-in fade-in slide-in-from-right-5"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      <div className="h-full flex flex-col">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[240px] space-y-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <Badge variant="destructive" className="text-sm">
              Error connecting to WebSocket server
            </Badge>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-col items-center justify-center h-[240px] space-y-4">
            <LoaderPinwheel className="w-8 h-8 animate-spin text-blue-500" />
            <Badge variant="outline" className="text-sm">
              Connecting to WebSocket server...
            </Badge>
          </div>
        ) : (
          <>
            {/* Enhanced Model Progress with Connection Status - Toolbox Style */}
            <div className="space-y-6 shrink-0">
              {/* Model Progress Toolbox */}
              {currentStage !== ModelStages.PARAMETERS && (
                <Card className="border-2 border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-800">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">Model Progress</CardTitle>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Training in progress</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{`${currentProgress.toFixed()}%`}</span>
                      </div>
                      <Progress value={currentProgress} className="h-3 bg-blue-100 dark:bg-blue-900/50" />
                    </div>
                    
                    {/* Progress Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-blue-200/30 dark:border-blue-700/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Stage</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{MODEL_STAGE_LABELS[currentStage]}</div>
                      </div>
                      
                      <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-blue-200/30 dark:border-blue-700/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {currentProgress === 100 ? 'Complete' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Connection Health Alert Toolbox */}
            {error && (
              <Card className="border-2 border-red-200/50 dark:border-red-800/50 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-950/30 dark:to-pink-950/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center border border-red-200 dark:border-red-800">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-red-900 dark:text-red-100">Connection Error</CardTitle>
                      <p className="text-sm text-red-700 dark:text-red-300">Issue detected with WebSocket connection</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 border border-red-200/30 dark:border-red-700/30">
                    {/* Type assertion needed due to TypeScript inference limitations with the error object */}
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">{(error as any).message}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs border-red-300 dark:border-red-600 text-red-700 dark:text-red-300">
                        {(error as any).retryable ? 'Retryable' : 'Non-retryable'}
                      </Badge>
                      <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded">
                        {(error as any).timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connection Recommendations Toolbox */}
            {health.quality !== 'excellent' && health.recommendations.length > 0 && (
              <Card className="border-2 border-yellow-200/50 dark:border-yellow-800/50 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-950/30 dark:to-amber-950/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center border border-yellow-200 dark:border-yellow-800">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-yellow-900 dark:text-yellow-100">Connection Recommendations</CardTitle>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Suggestions to improve connection quality</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {health.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-yellow-200/30 dark:border-yellow-700/30 shadow-sm">
                        <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="flex-1 flex flex-col mt-2"
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
                {Object.entries(MODEL_STAGE_LABELS).map(([stage, label]) => (
                  <TabsTrigger
                    key={stage}
                    value={stage}
                    className="text-xs md:text-sm"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4 rounded-lg border bg-card p-4 flex-1 overflow-hidden">
                {selectedParams && currentStage !== ModelStages.PARAMETERS && (
                  <div className="mb-4 flex gap-2">
                    <Badge variant="outline">
                      Model: {selectedParams.modelType}
                    </Badge>
                    <Badge variant="outline">
                      Ticker: {selectedParams.ticker}
                    </Badge>
                  </div>
                )}

                <div className="overflow-hidden">
                  <TabsContent
                    value={ModelStages.PARAMETERS.toString()}
                    className="h-full overflow-auto"
                  >
                    {activeTab === ModelStages.PARAMETERS.toString() ? (
                      <div className="overflow-auto flex-1">
                        <ModelTrainingForm
                          isTraining={isPending}
                          onStartTraining={mutate}
                        />
                      </div>
                    ) : (
                      <StagePlaceholder
                        stage={ModelStages.PARAMETERS}
                        isComplete={isStageComplete(ModelStages.PARAMETERS)}
                        currentStage={currentStage}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value={ModelStages.TRAINING.toString()}>
                    <div className="overflow-auto flex-1">
                      {activeTab === ModelStages.TRAINING.toString() &&
                      progressData.training ? (
                        <div className="space-y-4">
                          <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            <MetricCard
                              title="Epoch"
                              value={`${
                                progressData.training.data.epoch ?? 0
                              } / ${
                                progressData.training.data.total_epochs ?? 0
                              }`}
                            />
                            <MetricCard
                              title="Loss"
                              value={
                                progressData.training.data.loss?.toFixed(4) ??
                                "N/A"
                              }
                            />
                            <MetricCard
                              title="Validation Loss"
                              value={
                                progressData.training.data.val_loss?.toFixed(
                                  4
                                ) ?? "N/A"
                              }
                            />
                            <MetricCard
                              title="Timestamp"
                              value={`${new Date(
                                progressData.training.timestamp
                              ).getSeconds()} seconds`}
                            />
                          </div>
                        </div>
                      ) : (
                        <StagePlaceholder
                          stage={ModelStages.TRAINING}
                          isComplete={isStageComplete(ModelStages.TRAINING)}
                          currentStage={currentStage}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value={ModelStages.EVALUATING.toString()}>
                    <div className="overflow-auto flex-1">
                      <div className="min-w-[600px] max-w-full">
                        {progressData.evaluating?.data.metrics ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Metric</TableHead>
                                <TableHead>Train</TableHead>
                                <TableHead>Test</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(
                                progressData.evaluating?.data.metrics.train ??
                                  {}
                              ).map(([metric, value]) => (
                                <TableRow key={metric}>
                                  <TableCell className="font-medium">
                                    {metric.toUpperCase()}
                                  </TableCell>
                                  <TableCell>{value.toFixed(4)}</TableCell>
                                  <TableCell>
                                    {progressData.evaluating?.data.metrics.test?.[
                                      metric as keyof typeof progressData.evaluating.data.metrics.test
                                    ]?.toFixed(4) ?? "N/A"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <StagePlaceholder
                            stage={ModelStages.EVALUATING}
                            isComplete={isStageComplete(ModelStages.EVALUATING)}
                            currentStage={currentStage}
                          />
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value={ModelStages.VISUALIZING.toString()}>
                    <div className="overflow-auto flex-1">
                      {progressData.visualizing?.data.progress ? (
                        <div className="space-y-4">
                          {progressData.visualizing.data.progress !== 100 ? (
                            <div className="space-y-4 place-items-center w-full h-full gap-2">
                              <LoaderPinwheel className="w-8 h-8 animate-spin text-blue-500" />
                              <MetricCard
                                title="Generating Plot"
                                value={progressData.visualizing.data.current_plot
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (char) =>
                                    char.toUpperCase()
                                  )}
                              />
                            </div>
                          ) : progressData.visualizing.data.plots ? (
                            <div className="space-y-4 max-w-full">
                              <h4 className="font-medium">Generated Plots</h4>
                              <PlotGrid
                                plots={progressData.visualizing.data.plots}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <StagePlaceholder
                          stage={ModelStages.VISUALIZING}
                          isComplete={isStageComplete(ModelStages.VISUALIZING)}
                          currentStage={currentStage}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value={ModelStages.PREDICTING.toString()}>
                    <div className="overflow-auto flex-1">
                      {activeTab === ModelStages.PREDICTING.toString() ? (
                        <PredictionForm
                          isPredicting={isPredicting}
                          onSubmit={(data) => predict(data)}
                        />
                      ) : (
                        <StagePlaceholder
                          stage={ModelStages.PREDICTING}
                          isComplete={isStageComplete(ModelStages.PREDICTING)}
                          currentStage={currentStage}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value={ModelStages.RESULTS.toString()}>
                    <div className="overflow-auto flex-1">
                      {currentStage === ModelStages.RESULTS ? (
                        <ResultsCard predictions={predictionsData} />
                      ) : (
                        <StagePlaceholder
                          stage={ModelStages.RESULTS}
                          isComplete={isStageComplete(ModelStages.RESULTS)}
                          currentStage={currentStage}
                        />
                      )}
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </>
        )}
      </div>
    </Widget>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold truncate">{value}</div>
    </div>
  );
}
