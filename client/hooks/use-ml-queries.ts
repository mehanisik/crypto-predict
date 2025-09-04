import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiService } from "@/lib/api";
import type { TrainingRequest, PredictionRequest } from "@/lib/api";

export const mlQueryKeys = {
	health: ["health"] as const,
	runningTrainings: ["running-trainings"] as const,
	trainingStatus: (sessionId: string) =>
		["training-status", sessionId] as const,
	prediction: (params: PredictionRequest) => ["prediction", params] as const,
	trainingHistory: ["training-history"] as const,
};

export const useHealth = () => {
	return useQuery({
		queryKey: mlQueryKeys.health,
		queryFn: ApiService.getHealth,
		staleTime: 30 * 1000, // 30 seconds
		refetchInterval: 60 * 1000, // Refetch every minute
	});
};

export const useRunningTrainings = () => {
	return useQuery({
		queryKey: mlQueryKeys.runningTrainings,
		queryFn: ApiService.getRunningTrainings,
		staleTime: 10 * 1000, // 10 seconds
		refetchInterval: 30 * 1000, // Refetch every 30 seconds
	});
};

export const useTrainingStatus = (sessionId: string | null) => {
	return useQuery({
		queryKey: mlQueryKeys.trainingStatus(sessionId || ""),
		queryFn: () => ApiService.getTrainingStatus(sessionId!),
		enabled: !!sessionId,
		staleTime: 5 * 1000, // 5 seconds
		refetchInterval: 10 * 1000, // Refetch every 10 seconds
	});
};

export const usePrediction = (params: PredictionRequest | null) => {
	return useQuery({
		queryKey: mlQueryKeys.prediction(params!),
		queryFn: () => ApiService.getPrediction(params!),
		enabled: !!params,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

export const useStartTraining = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: TrainingRequest) => ApiService.startTraining(data),
		onSuccess: (response) => {
			queryClient.invalidateQueries({ queryKey: mlQueryKeys.runningTrainings });

			if (response.session_id) {
				queryClient.prefetchQuery({
					queryKey: mlQueryKeys.trainingStatus(response.session_id),
					queryFn: () => ApiService.getTrainingStatus(response.session_id),
				});
			}
		},
		onError: (error) => {
			console.error("Training start failed:", error);
		},
	});
};

export const useCancelTraining = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (sessionId: string) => ApiService.cancelTraining(sessionId),
		onSuccess: (_, sessionId) => {
			queryClient.invalidateQueries({ queryKey: mlQueryKeys.runningTrainings });
			queryClient.invalidateQueries({
				queryKey: mlQueryKeys.trainingStatus(sessionId),
			});
		},
		onError: (error) => {
			console.error("Training cancellation failed:", error);
		},
	});
};

export const useMakePrediction = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: PredictionRequest) => ApiService.getPrediction(data),
		onSuccess: (response, variables) => {
			queryClient.setQueryData(mlQueryKeys.prediction(variables), response);
		},
		onError: (error) => {
			console.error("Prediction failed:", error);
		},
	});
};

// Hook to invalidate training-related queries when WebSocket events occur
export const useTrainingQueryInvalidator = () => {
	const queryClient = useQueryClient();

	return {
		invalidateOnTrainingComplete: (sessionId: string) => {
			queryClient.invalidateQueries({ queryKey: mlQueryKeys.runningTrainings });
			queryClient.invalidateQueries({
				queryKey: mlQueryKeys.trainingStatus(sessionId),
			});
			queryClient.invalidateQueries({ queryKey: mlQueryKeys.trainingHistory });
		},
		invalidateOnTrainingProgress: (sessionId: string) => {
			queryClient.invalidateQueries({
				queryKey: mlQueryKeys.trainingStatus(sessionId),
			});
		},
		invalidateOnTrainingStart: () => {
			queryClient.invalidateQueries({ queryKey: mlQueryKeys.runningTrainings });
		},
	};
};
