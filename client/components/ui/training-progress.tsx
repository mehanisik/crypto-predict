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
	Eye,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket";

export interface TrainingProgressProps {
	sessionId: string;
	onComplete?: (results: any) => void;
	onError?: (error: string) => void;
}

export function TrainingProgress({
	sessionId,
	onComplete,
	onError,
}: TrainingProgressProps) {
	const { isConnected, joinTrainingRoom, leaveTrainingRoom, onTrainingUpdate } =
		useWebSocket();
	const [currentStage, setCurrentStage] = useState<string>("data_fetching");
	const [progress, setProgress] = useState(0);
	const [trainingData, setTrainingData] = useState<
		Record<string, Record<string, unknown>>
	>({});
	const [error, setError] = useState<string | null>(null);

	// Join training room once when connected; leave only on unmount
	useEffect(() => {
		if (isConnected && sessionId) {
			joinTrainingRoom(sessionId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConnected, sessionId]);

	useEffect(() => {
		return () => {
			if (sessionId) {
				leaveTrainingRoom(sessionId);
			}
		};
	}, [leaveTrainingRoom, sessionId]);

	// Listen for training updates (type-safe)
	useEffect(() => {
		return onTrainingUpdate((data: Record<string, unknown>) => {
			console.log("TrainingProgress received update:", data);

			// Extract normalized fields (WebSocket layer handles unification)
			const eventName = data.event as string;
			const type = (data.type as string) || (data.data_type as string);
			const stage =
				(eventName as TrainingStage) ||
				(type as TrainingStage) ||
				"training_update";
			const progressValue = data.progress as number;
			const payload = data.data as Record<string, unknown>;
			const message = data.message as string;

			// Update current stage and progress
			if (stage) {
				setCurrentStage(stage);
			}

			if (typeof progressValue === "number") {
				setProgress(progressValue);
			}

			// Store training data
			if (payload && stage) {
				setTrainingData((prev: Record<string, Record<string, unknown>>) => ({
					...prev,
					[stage]: payload,
				}));
			}

			// Handle completion - check for plots in payload or series data
			const hasPlots = payload && ("plots" in payload || "series" in payload);
			if (stage === "visualizing_update" || stage === "series") {
				if (hasPlots) {
					onComplete?.(payload);
				}
			}

			// Handle training completion
			if (stage === "training_completed" || stage === "training_complete") {
				onComplete?.(payload);
			}

			// Handle errors
			if (data.error) {
				setError(data.error as string);
				onError?.(data.error as string);
			}
		});

		return cleanup;
	}, [onTrainingUpdate, onComplete, onError]);

	const getStageIcon = (stage: string) => {
		switch (stage) {
			case "data_fetching":
			case "data_fetched":
				return <Database className="h-4 w-4" />;
			case "preprocessing":
				return <Settings className="h-4 w-4" />;
			case "feature_engineering":
				return <Zap className="h-4 w-4" />;
			case "model_building":
			case "model_info":
				return <Layers className="h-4 w-4" />;
			case "training_update":
			case "training_progress":
			case "metric_sample":
				return <Brain className="h-4 w-4" />;
			case "evaluating_update":
				return <BarChart3 className="h-4 w-4" />;
			case "visualizing_update":
			case "series":
				return <Eye className="h-4 w-4" />;
			case "training_completed":
			case "training_complete":
				return <CheckCircle className="h-4 w-4" />;
			default:
				return <Clock className="h-4 w-4" />;
		}
	};

	const getStageName = (stage: string) => {
		switch (stage) {
			case "data_fetching":
				return "Data Fetching";
			case "data_fetched":
				return "Data Retrieved";
			case "preprocessing":
				return "Preprocessing";
			case "feature_engineering":
				return "Feature Engineering";
			case "model_building":
				return "Model Building";
			case "model_info":
				return "Model Ready";
			case "training_update":
			case "training_progress":
			case "metric_sample":
				return "Training";
			case "evaluating_update":
				return "Evaluating";
			case "visualizing_update":
			case "series":
				return "Generating Visualizations";
			case "training_completed":
			case "training_complete":
				return "Training Complete";
			default:
				return "Idle";
		}
	};

	const getStageDescription = (
		stage: string,
		data: Record<string, unknown>,
	) => {
		if (!data) return "";

		const getMessage = (data: Record<string, unknown>) =>
			data.message as string;

		switch (stage) {
			case "data_fetching":
				return getMessage(data) || `Fetching ${data.ticker as string} data...`;
			case "data_fetched":
				return (
					getMessage(data) || `${data.rows as number} data points retrieved`
				);
			case "preprocessing":
				return (
					getMessage(data) || `${data.features as number} features processed`
				);
			case "feature_engineering":
				return (
					getMessage(data) || `${data.features as number} features engineered`
				);
			case "model_building":
				return (
					getMessage(data) || `Building ${data.model_type as string} model`
				);
			case "model_info":
				return getMessage(data) || `${data.model_type as string} model ready`;
			case "training_update":
			case "training_progress":
			case "metric_sample":
				return (
					getMessage(data) ||
					`Training epoch ${data.epoch as number}/${data.total_epochs as number}`
				);
			case "evaluating_update":
				return (
					getMessage(data) ||
					`Calculating ${(data.current_metric as string)?.toUpperCase()} metric`
				);
			case "visualizing_update":
			case "series":
				return (
					getMessage(data) ||
					`Generating ${data.current_plot as string} visualization`
				);
			case "training_completed":
			case "training_complete":
				return getMessage(data) || "Training completed successfully";
			default:
				return getMessage(data) || "";
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
							<h3 className="font-medium text-sm">
								{getStageName(currentStage)}
							</h3>
							<p className="text-sm text-muted-foreground">
								{getStageDescription(currentStage, trainingData[currentStage])}
							</p>
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

					{progress > 0 && <Progress value={progress} className="h-2 mt-3" />}
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
											<div className="font-bold">
												{trainingData.data_fetched.rows}
											</div>
											<div className="text-muted-foreground">Rows</div>
										</div>
										<div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
											<div className="font-bold">
												{trainingData.data_fetched.train_samples}
											</div>
											<div className="text-muted-foreground">Train</div>
										</div>
										<div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
											<div className="font-bold">
												{trainingData.data_fetched.test_samples}
											</div>
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
											<div className="font-bold">
												{trainingData.training_update.epoch}/
												{trainingData.training_update.total_epochs}
											</div>
											<div className="text-muted-foreground">Epoch</div>
										</div>
										<div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
											<div className="font-bold">
												{trainingData.training_update.loss?.toFixed(4) || "N/A"}
											</div>
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
					<AlertDescription>Training failed: {error}</AlertDescription>
				</Alert>
			)}

			{/* Completion Status */}
			{currentStage === "visualizing_update" && progress === 100 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Training Complete</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2 text-green-600">
							<CheckCircle className="h-5 w-5" />
							<span className="font-medium">
								Model training completed successfully!
							</span>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
