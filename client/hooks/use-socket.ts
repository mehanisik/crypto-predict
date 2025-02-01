"use client";

import { useState, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { ModelStages } from "@/constants/model-stages.constant";
import { TrainingUpdateResponse } from "@/types/training-update";
import { EvaluatingUpdateResponse } from "@/types/evaluating-update";
import { VisualizingUpdateResponse } from "@/types/visualizing-update";

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

export function useModelSocket() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progressData, setProgressData] = useState<{
    training?: TrainingUpdateResponse;
    evaluating?: EvaluatingUpdateResponse;
    visualizing?: VisualizingUpdateResponse;
  }>({});

  const [currentStage, setCurrentStage] = useState<ModelStages>(
    ModelStages.PARAMETERS
  );
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  const handleTrainingUpdate = useCallback((data: TrainingUpdateResponse) => {
    setProgressData((prev) => ({ ...prev, training: data }));
    setCurrentStage(ModelStages.TRAINING);
    setCurrentProgress(data.data.progress);
  }, []);

  const handleEvaluationUpdate = useCallback(
    (data: EvaluatingUpdateResponse) => {
      setProgressData((prev) => ({ ...prev, evaluating: data }));
      setCurrentStage(ModelStages.EVALUATING);
      setCurrentProgress(data.data.progress);
    },
    []
  );

  const handleVisualizationUpdate = useCallback(
    (data: VisualizingUpdateResponse) => {
      setProgressData((prev) => ({ ...prev, visualizing: data }));
      setCurrentStage(ModelStages.VISUALIZING);
      setCurrentProgress(data.data.progress);
      if (data.data.progress === 100) setCurrentStage(ModelStages.PREDICTING);
    },
    []
  );

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to WebSocket server");
    });
    socket.on("connect_error", (err) => {
      setError(new Error(`Connection failed: ${err.message}`));
      console.error(`Connection failed: ${err.message}`);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("training_update", handleTrainingUpdate);
    socket.on("evaluating_update", handleEvaluationUpdate);
    socket.on("visualizing_update", handleVisualizationUpdate);

    return () => {
      socket.disconnect();
      socket.off("training_update", handleTrainingUpdate);
      socket.off("evaluating_update", handleEvaluationUpdate);
      socket.off("visualizing_update", handleVisualizationUpdate);
    };
  }, [handleTrainingUpdate, handleEvaluationUpdate, handleVisualizationUpdate]);

  const resetState = useCallback(() => {
    setProgressData({});
    setError(null);
    setCurrentStage(ModelStages.PARAMETERS);
    setCurrentProgress(0);
  }, []);

  const isStageComplete = useCallback(
    (stage: ModelStages) => {
      const stageOrder = Object.values(ModelStages);
      const currentIndex = stageOrder.indexOf(currentStage);
      const stageIndex = stageOrder.indexOf(stage);
      return currentIndex > stageIndex;
    },
    [currentStage]
  );

  return {
    isConnected,
    error,
    progressData,
    currentStage,
    currentProgress,
    setCurrentStage,
    resetState,
    isStageComplete,
  };
}
