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

  const [activeTab, setActiveTab] = useState<string>(currentStage.toString());
  const [selectedParams, setSelectedParams] = useState<SelectedParams>(null);
  const [predictionsData, setPredictionsData] = useState<PredictionResponse>();

  useEffect(() => {
    setActiveTab(currentStage.toString());
  }, [currentStage]);

  const getStageStatus = (stage: ModelStages) => {
    if (currentStage === stage) return "default";
    if (isStageComplete(stage)) return "success";
    return currentStage > stage ? "secondary" : "outline";
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormParams) => {
      setSelectedParams({
        modelType: data.modelType,
        ticker: data.ticker,
      });
      const response = await server.post("/train", {
        ticker: data.ticker,
        start_date: data.startDate,
        end_date: data.endDate,
        lookback: data.lookback,
        epochs: data.epochs,
        model: data.modelType,
      });
      return response.data;
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
          <div className="flex flex-wrap gap-2">
            {Object.values(ModelStages).map((stage) => (
              <Badge
                key={stage}
                variant={getStageStatus(stage)}
                className="text-xs"
              >
                {MODEL_STAGE_LABELS[stage]}
              </Badge>
            ))}
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
            {currentStage !== ModelStages.PARAMETERS && (
              <div className="space-y-2 shrink-0">
                <div className="flex justify-between text-sm">
                  <span>{currentStage ? "In progress..." : "Ready"}</span>
                  <span>{`${currentProgress.toFixed()}%`}</span>
                </div>
                <Progress value={currentProgress} className="h-2" />
              </div>
            )}

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
