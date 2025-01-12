"use client";
import React, { useState, useCallback, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import BaseWidget from "../ui/widget";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

import { TaskStage } from "@/constants/task-stage.constant";
import { STAGES } from "@/constants/model-stages.constant";
import { PlotData } from "@/types/plot";
import { ModelParameters, ModelParams } from "../ui/model-parameters";
import { useSocketConnection } from "@/lib/use-socket";
import { StageCard } from "../ui/stage-card";
import PlotCard from "../ui/plot";
import { transformPlotData } from "@/lib/transform-plot-data";

interface StatsData {
  [key: string]: number | string;
}

const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const PricePredictionWidget: React.FC = () => {
  const [params, setParams] = useState<ModelParams>(() => ({
    ticker_symbol: "BTC-USD",
    start_date: formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
    end_date: formatDate(new Date()),
    epochs: 100,
  }));

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [plots, setPlots] = useState<Record<string, PlotData>>({});
  const [stats, setStats] = useState<Record<string, StatsData>>({});
  const [activeStage, setActiveStage] = useState<TaskStage | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleParamChange = useCallback(
    (key: keyof ModelParams, value: string | number) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const mutation = useMutation({
    mutationFn: async (data: ModelParams) => {
      const response = await axios.post("/api/train", data);
      return response.data;
    },
    onSuccess: (data) => {
      setTaskId(data.task_id);
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || "Failed to start training");
    },
  });

  const socketHandlers = useMemo(
    () => ({
      data_fetch: (data: any) => {
        setActiveStage(TaskStage.DataFetch);
        setPlots((prev) => ({
          ...prev,
          dataFetch: transformPlotData(JSON.parse(data.plot)),
        }));
        setStats((prev) => ({ ...prev, dataFetch: data.stats }));
      },
      preprocessing: (data: any) => {
        setActiveStage(TaskStage.Preprocessing);
        setPlots((prev) => ({
          ...prev,
          preprocessing: transformPlotData(JSON.parse(data.plot)),
        }));
        setStats((prev) => ({ ...prev, preprocessing: data.stats }));
      },
      feature_engineering: (data: any) => {
        setActiveStage(TaskStage.FeatureEngineering);
        setPlots((prev) => ({
          ...prev,
          featureEngineering: transformPlotData(JSON.parse(data.plot)),
        }));
        setStats((prev) => ({ ...prev, featureEngineering: data.stats }));
      },
      training_progress: (data: any) => {
        setActiveStage(TaskStage.Training);
        setProgress(data.progress);
        if (data.loss_plot) {
          setPlots((prev) => ({
            ...prev,
            training: transformPlotData(JSON.parse(data.loss_plot)),
          }));
        }
      },
      evaluation: (data: any) => {
        setActiveStage(TaskStage.Evaluation);
        setPlots((prev) => ({
          ...prev,
          evaluation: transformPlotData(JSON.parse(data.plot)),
        }));
        setStats((prev) => ({ ...prev, evaluation: data.stats }));
      },
      error: (data: any) => setError(data.message),
    }),
    []
  );

  useSocketConnection(taskId, socketHandlers);

  return (
    <BaseWidget
      title="AI Price Prediction Model"
      headerContent={
        <ModelParameters
          params={params}
          onChange={handleParamChange}
          onSubmit={() => mutation.mutate(params)}
          isLoading={mutation.isPending}
        />
      }
    >
      <div className="space-y-6 p-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {STAGES.map((stage) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    isActive={activeStage === stage.id}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-8 space-y-6">
            {progress > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Training Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {progress.toFixed(1)}% Complete
                  </p>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="plots" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plots">Visualizations</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="plots" className="space-y-4">
                {Object.entries(plots).map(([key, plot]) => (
                  <PlotCard
                    key={key}
                    title={key.replace(/([A-Z])/g, " $1").trim()}
                    plot={plot}
                  />
                ))}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                {Object.entries(stats).map(([key, statData]) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle>
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        {Object.entries(statData).map(([statKey, value]) => (
                          <div key={statKey}>
                            <dt className="text-sm font-medium text-muted-foreground">
                              {statKey.replace(/([A-Z])/g, " $1").trim()}
                            </dt>
                            <dd className="text-2xl font-bold">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

export default PricePredictionWidget;
