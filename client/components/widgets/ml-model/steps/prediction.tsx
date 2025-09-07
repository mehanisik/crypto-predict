"use client";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useMlModelStore } from "@/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import predictionSchema from "@/schemas/model-prediction";
import { makePrediction } from "@/lib/actions";
import type { PredictionResponse } from "@/types/ml-model";
import { TrendingUp, Calendar, BarChart3, CheckCircle } from "lucide-react";

interface FormValues {
	startDate: string;
	days: number;
}

export function PredictionStep() {
	const training = useMlModelStore((s) => s.training);
	const prediction = useMlModelStore((s) => s.prediction);
	const predictionResults = useMlModelStore((s) => s.predictionResults);
	const setPrediction = useMlModelStore((s) => s.setPrediction);
	const setPredictionResults = useMlModelStore((s) => s.setPredictionResults);
	const isTrainingComplete = useMlModelStore((s) => s.isTrainingComplete);

	// Debug logging
	console.log("🔮 Store predictionResults:", predictionResults);
	console.log("🔮 Store predictions array:", predictionResults?.predictions);
	console.log("🔮 Store predictions length:", predictionResults?.predictions?.length);

	const form = useForm<FormValues>({
		resolver: zodResolver(predictionSchema),
		defaultValues: {
			startDate: prediction.predStartDate,
			days: prediction.predDays,
		},
	});

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (formData: FormData) => {
		try {
			setIsLoading(true);
			setError(null);
			
			const startDate = String(
				formData.get("startDate") || prediction.predStartDate,
			);
			const days = Number(formData.get("days") || prediction.predDays);
			const payload = {
				ticker: training.ticker,
				start_date: startDate,
				days,
			};
			const result = await makePrediction(payload);
			console.log("🔮 Prediction result:", result);
			console.log("🔮 Predictions array:", result.predictions);
			console.log("🔮 Predictions length:", result.predictions?.length);
			setPredictionResults(result);
		} catch (e: any) {
			console.error("🔮 Prediction error:", e);
			setError(e?.message || "Prediction failed");
		} finally {
			setIsLoading(false);
		}
	};

	const onLocalChange = (values: Partial<FormValues>) => {
		if (values.startDate !== undefined)
			setPrediction({ predStartDate: values.startDate });
		if (values.days !== undefined) setPrediction({ predDays: values.days });
	};

	return (
		<div className="space-y-6 h-full flex flex-col">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<TrendingUp className="h-5 w-5 text-green-600" />
					<h3 className="text-lg font-semibold">Make Predictions</h3>
				</div>
				<Badge variant="outline" className="text-xs">
					{training.ticker} • {training.modelType}
				</Badge>
			</div>

			{isTrainingComplete ? (
				<Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
					<CheckCircle className="h-4 w-4 text-green-600" />
					<AlertDescription className="text-green-800 dark:text-green-200">
						Training completed successfully! You can now make predictions using
						the trained model.
					</AlertDescription>
				</Alert>
			) : (
				<Alert>
					<AlertDescription>
						Training must be completed before making predictions.
					</AlertDescription>
				</Alert>
			)}

			<Card className="flex-1">
				<CardHeader className="pb-4">
					<CardTitle className="text-base flex items-center gap-2">
						<BarChart3 className="h-4 w-4" />
						Prediction Parameters
					</CardTitle>
					<CardDescription className="text-sm">
						Configure the prediction period and generate price forecasts
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<form onSubmit={(e) => {
						e.preventDefault();
						const formData = new FormData(e.currentTarget);
						handleSubmit(formData);
					}} className="space-y-4">
						<input type="hidden" name="ticker" value={training.ticker} />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label
									htmlFor="startDate"
									className="text-sm flex items-center gap-2"
								>
									<Calendar className="h-3 w-3" />
									Start Date
								</Label>
								<Input
									id="startDate"
									name="startDate"
									type="date"
									value={form.watch("startDate")}
									onChange={(e) => {
										form.setValue("startDate", e.target.value, {
											shouldValidate: true,
										});
										onLocalChange({ startDate: e.target.value });
									}}
									className="h-10"
									disabled={!isTrainingComplete}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="days" className="text-sm">
									Prediction Days
								</Label>
								<Input
									id="days"
									name="days"
									type="number"
									min={1}
									max={60}
									value={form.watch("days")}
									onChange={(e) => {
										const v = Number(e.target.value);
										form.setValue("days", v, { shouldValidate: true });
										onLocalChange({ days: v });
									}}
									className="h-10"
									disabled={!isTrainingComplete}
								/>
							</div>
						</div>

						<Button
							type="submit"
							disabled={!isTrainingComplete || isLoading}
							className="w-full"
						>
							{isLoading ? "Generating Predictions..." : "Generate Predictions"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{predictionResults ? (
				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="text-base flex items-center justify-between">
							<span className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4" />
								Prediction Results
							</span>
							<Badge variant="outline" className="text-xs">
								{predictionResults.ticker} • {predictionResults.predictions?.length ?? 0}{" "}
								predictions
							</Badge>
						</CardTitle>
						{predictionResults.data_range && (
							<div className="text-xs text-muted-foreground mt-2">
								<span className="font-medium">Data Range:</span>{" "}
								{predictionResults.data_range.start_date} to{" "}
								{predictionResults.data_range.end_date} •
								<span className="font-medium ml-2">Predictions:</span>{" "}
								{predictionResults.data_range.prediction_start} onwards
							</div>
						)}
						{predictionResults.model_config && (
							<div className="text-xs text-muted-foreground mt-1">
								<span className="font-medium">Model:</span>{" "}
								{predictionResults.model_config.model_type} •
								<span className="font-medium ml-2">Lookback:</span>{" "}
								{predictionResults.model_config.lookback_days} days •
								<span className="font-medium ml-2">Epochs:</span>{" "}
								{predictionResults.model_config.epochs}
							</div>
						)}
					</CardHeader>
					<CardContent>
						{predictionResults.predictions && predictionResults.predictions.length > 0 ? (
							<div className="space-y-4">
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/20 rounded-lg">
									<div className="text-center">
										<div className="text-lg font-semibold text-green-600">
											$
											{predictionResults.predictions[0]?.predicted_price?.toFixed(
												0,
											) || "N/A"}
										</div>
										<div className="text-xs text-muted-foreground">
											First Prediction
										</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-blue-600">
											$
											{predictionResults.predictions[
												predictionResults.predictions.length - 1
											]?.predicted_price?.toFixed(0) || "N/A"}
										</div>
										<div className="text-xs text-muted-foreground">
											Last Prediction
										</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-purple-600">
											{(
												(predictionResults.predictions[0]?.confidence_score || 0) *
												100
											).toFixed(0)}
											%
										</div>
										<div className="text-xs text-muted-foreground">
											Avg Confidence
										</div>
									</div>
									<div className="text-center">
										<div className="text-lg font-semibold text-orange-600">
											{predictionResults.predictions.length}
										</div>
										<div className="text-xs text-muted-foreground">
											Total Days
										</div>
									</div>
								</div>

								<div className="max-h-80 overflow-auto space-y-2">
									{predictionResults.predictions.map((p) => (
										<div
											key={p.date}
											className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
										>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													<span className="font-medium text-sm">{p.date}</span>
													<Badge variant="outline" className="text-xs">
														Day {p.date}
													</Badge>
												</div>
												<div className="text-right">
													<div className="font-semibold text-green-600">
														${p.predicted_price?.toFixed(2) || "N/A"}
													</div>
													<div className="text-xs text-muted-foreground">
														Confidence:{" "}
														{((p.confidence_score || 0) * 100).toFixed(0)}%
													</div>
												</div>
											</div>

											<div className="grid grid-cols-3 gap-2 text-xs">
												<div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
													<div className="font-medium text-red-600">
														${p.lower_bound?.toFixed(0) || "N/A"}
													</div>
													<div className="text-red-500">Lower Bound</div>
												</div>
												<div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
													<div className="font-medium text-blue-600">
														${p.predicted_price?.toFixed(0) || "N/A"}
													</div>
													<div className="text-blue-500">Predicted</div>
												</div>
												<div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
													<div className="font-medium text-green-600">
														${p.upper_bound?.toFixed(0) || "N/A"}
													</div>
													<div className="text-green-500">Upper Bound</div>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p className="text-sm">No predictions available</p>
								<p className="text-xs mt-1">Try generating predictions first</p>
							</div>
						)}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
