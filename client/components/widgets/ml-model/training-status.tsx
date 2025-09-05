"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	Activity,
	CheckCircle,
	Clock,
	TrendingUp,
	Target,
	Zap,
} from "lucide-react";
import { useMlModelStore } from "@/store";
import { useMemo } from "react";

export function TrainingStatus() {
	const messages = useMlModelStore((s) => s.messages);

	const latestProgress = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const p = messages[i].progress;
			if (typeof p === "number" && !Number.isNaN(p)) return Math.round(p);
		}
		return 0;
	}, [messages]);

	const finalMetrics = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			const m = messages[i];
			if (m.event === "training_completed" || m.event === "training_complete") {
				const data = (m.data as Record<string, unknown>) || {};
				const metrics = (data["metrics"] as Record<string, number>) || {};
				return {
					final_accuracy:
						(data["final_accuracy"] as number) ?? metrics["accuracy"],
					final_loss: (data["final_loss"] as number) ?? metrics["loss"],
					r2: metrics["r2"],
					mae: metrics["mae"],
					rmse: metrics["rmse"],
					mape: metrics["mape"],
				} as {
					final_accuracy?: number;
					final_loss?: number;
					r2?: number;
					mae?: number;
					rmse?: number;
					mape?: number;
				};
			}
		}
		return null as null;
	}, [messages]);

	const isTrainingComplete = latestProgress >= 100;
	const isTrainingInProgress = latestProgress > 0 && latestProgress < 100;

	const getStatusIcon = () => {
		if (isTrainingComplete)
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		if (isTrainingInProgress)
			return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
		return <Clock className="h-4 w-4 text-muted-foreground" />;
	};

	const getStatusText = () => {
		if (isTrainingComplete) return "Training Complete";
		if (isTrainingInProgress) return "Training in Progress";
		return "Ready to Train";
	};

	const getStatusColor = () => {
		if (isTrainingComplete)
			return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
		if (isTrainingInProgress)
			return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
		return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
	};

	return (
		<Card>
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-lg">
					{getStatusIcon()}
					Training Status
				</CardTitle>
				<CardDescription>
					Monitor your model training progress and performance metrics
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">{getStatusText()}</span>
						<Badge variant="outline" className={getStatusColor()}>
							{latestProgress}%
						</Badge>
					</div>
					<Progress value={latestProgress} className="h-3" />
					{isTrainingInProgress && (
						<p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
							Training is in progress. This may take several minutes depending
							on your configuration.
						</p>
					)}
				</div>

				{finalMetrics !== null && (
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-green-500" />
							<h4 className="text-sm font-medium">Final Performance Metrics</h4>
						</div>
						<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
							{finalMetrics?.final_accuracy != null && (
								<div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<Target className="h-3 w-3 text-green-600" />
										<span className="text-xs font-medium text-green-700 dark:text-green-300">
											Accuracy
										</span>
									</div>
									<div className="text-lg font-bold text-green-700 dark:text-green-300">
										{((finalMetrics?.final_accuracy ?? 0) * 100).toFixed(2)}%
									</div>
								</div>
							)}
							{finalMetrics?.final_loss != null && (
								<div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<Zap className="h-3 w-3 text-red-600" />
										<span className="text-xs font-medium text-red-700 dark:text-red-300">
											Loss
										</span>
									</div>
									<div className="text-lg font-bold text-red-700 dark:text-red-300">
										{(finalMetrics?.final_loss ?? 0).toFixed(4)}
									</div>
								</div>
							)}
							{finalMetrics?.r2 != null && (
								<div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<TrendingUp className="h-3 w-3 text-blue-600" />
										<span className="text-xs font-medium text-blue-700 dark:text-blue-300">
											R² Score
										</span>
									</div>
									<div className="text-lg font-bold text-blue-700 dark:text-blue-300">
										{(finalMetrics?.r2 ?? 0).toFixed(4)}
									</div>
								</div>
							)}
							{finalMetrics?.mae != null && (
								<div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<Target className="h-3 w-3 text-orange-600" />
										<span className="text-xs font-medium text-orange-700 dark:text-orange-300">
											MAE
										</span>
									</div>
									<div className="text-lg font-bold text-orange-700 dark:text-orange-300">
										{(finalMetrics?.mae ?? 0).toFixed(4)}
									</div>
								</div>
							)}
							{finalMetrics?.rmse != null && (
								<div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<Zap className="h-3 w-3 text-purple-600" />
										<span className="text-xs font-medium text-purple-700 dark:text-purple-300">
											RMSE
										</span>
									</div>
									<div className="text-lg font-bold text-purple-700 dark:text-purple-300">
										{(finalMetrics?.rmse ?? 0).toFixed(4)}
									</div>
								</div>
							)}
							{finalMetrics?.mape != null && (
								<div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 p-3 text-center">
									<div className="flex items-center justify-center gap-1 mb-1">
										<TrendingUp className="h-3 w-3 text-cyan-600" />
										<span className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
											MAPE
										</span>
									</div>
									<div className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
										{(finalMetrics?.mape ?? 0).toFixed(2)}%
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
