"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type * as z from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Wifi, WifiOff } from "lucide-react";
import trainingSchema from "@/schemas/model-training";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { TrainingProgress } from "@/components/ui/training-progress";
import { useWebSocket } from "@/lib/websocket";
import { Badge } from "@/components/ui/badge";

interface ModelTrainingFormProps {
	onStartTraining: (data: z.infer<typeof trainingSchema>) => void;
	isTraining: boolean;
}

type FormView = "basic" | "advanced" | "presets";

const PRESET_CONFIGS = {
	"quick-test": {
		ticker: "ETH-USD",
		modelType: "CNN",
		batchSize: 32,
		lookback: 10,
		epochs: 10,
		startDate: "2023-01-01",
		endDate: "2023-06-01",
	},
	production: {
		ticker: "BTC-USD",
		modelType: "CNN-LSTM",
		batchSize: 128,
		lookback: 30,
		epochs: 200,
		startDate: "2020-01-01",
		endDate: new Date().toISOString().split("T")[0],
	},
	experimental: {
		ticker: "SOL-USD",
		modelType: "LSTM-CNN",
		batchSize: 64,
		lookback: 15,
		epochs: 150,
		startDate: "2021-01-01",
		endDate: "2023-12-01",
	},
};

export function ModelTrainingForm({
	onStartTraining,
	isTraining,
}: ModelTrainingFormProps) {
	const [activeView, setActiveView] = useState<FormView>("basic");
	const { isConnected, isConnecting, error, reconnect } = useWebSocket();

	const form = useForm<z.infer<typeof trainingSchema>>({
		resolver: zodResolver(trainingSchema),
		defaultValues: {
			ticker: "ETH-USD",
			modelType: "CNN-LSTM",
			batchSize: 64,
			lookback: 10,
			epochs: 100,
			startDate: "2020-01-01",
			endDate: new Date().toISOString().split("T")[0],
		},
	});

	const applyPreset = (presetKey: keyof typeof PRESET_CONFIGS) => {
		const preset = PRESET_CONFIGS[presetKey];
		console.log("Applying preset:", presetKey, preset);
		Object.entries(preset).forEach(([key, value]) => {
			form.setValue(key as keyof z.infer<typeof trainingSchema>, value);
		});
	};

	const handleSubmit = async (data: z.infer<typeof trainingSchema>) => {
		console.log("Form submitted with data:", data);
		onStartTraining(data);
	};

	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

	const handleTrainingComplete = (results: unknown) => {
		console.log("Training completed:", results);
		setActiveSessionId(null);
	};

	const handleTrainingError = (error: string) => {
		console.error("Training error:", error);
		setActiveSessionId(null);
	};

	// Connection status component
	const ConnectionStatus = () => (
		<div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-background/50">
			{isConnected ? (
				<Wifi className="h-4 w-4 text-green-500" />
			) : (
				<WifiOff className="h-4 w-4 text-red-500" />
			)}
			<span className="text-sm font-medium">
				{isConnected ? "Connected" : "Disconnected"}
			</span>
			{isConnecting && (
				<Badge variant="secondary" className="text-xs">
					Connecting...
				</Badge>
			)}
			{error && (
				<Badge variant="destructive" className="text-xs">
					{error}
				</Badge>
			)}
			{!isConnected && !isConnecting && (
				<Button
					variant="outline"
					size="sm"
					onClick={reconnect}
					className="ml-auto"
				>
					Reconnect
				</Button>
			)}
		</div>
	);

	return (
		<div className="space-y-6">
			{/* Connection Status */}
			<ConnectionStatus />

			{/* Preset Configuration */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Quick Start</CardTitle>
					<CardDescription>
						Choose a preset configuration or customize your own
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ToggleGroup
						type="single"
						value={activeView}
						onValueChange={(value) => value && setActiveView(value as FormView)}
						className="justify-start"
					>
						<ToggleGroupItem value="basic" aria-label="Basic">
							Basic
						</ToggleGroupItem>
						<ToggleGroupItem value="advanced" aria-label="Advanced">
							Advanced
						</ToggleGroupItem>
						<ToggleGroupItem value="presets" aria-label="Presets">
							Presets
						</ToggleGroupItem>
					</ToggleGroup>

					{activeView === "presets" && (
						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							<Button
								variant="outline"
								onClick={() => applyPreset("quick-test")}
								className="h-auto p-4 flex-col items-start"
							>
								<div className="font-semibold">Quick Test</div>
								<div className="text-xs text-muted-foreground">
									Fast training for testing
								</div>
							</Button>
							<Button
								variant="outline"
								onClick={() => applyPreset("production")}
								className="h-auto p-4 flex-col items-start"
							>
								<div className="font-semibold">Production</div>
								<div className="text-xs text-muted-foreground">
									Optimized for production
								</div>
							</Button>
							<Button
								variant="outline"
								onClick={() => applyPreset("experimental")}
								className="h-auto p-4 flex-col items-start"
							>
								<div className="font-semibold">Experimental</div>
								<div className="text-xs text-muted-foreground">
									Advanced configurations
								</div>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Training Progress */}
			{activeSessionId && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Training Progress</CardTitle>
						<CardDescription>Real-time training updates</CardDescription>
					</CardHeader>
					<CardContent>
						<TrainingProgress
							sessionId={activeSessionId}
							onComplete={handleTrainingComplete}
							onError={handleTrainingError}
						/>
					</CardContent>
				</Card>
			)}

			{/* Main Form */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						{activeView === "basic"
							? "Basic Configuration"
							: activeView === "advanced"
								? "Advanced Configuration"
								: "Custom Configuration"}
					</CardTitle>
					<CardDescription>
						{activeView === "basic"
							? "Essential parameters for model training"
							: activeView === "advanced"
								? "Detailed configuration with all options"
								: "Customize your configuration after applying a preset"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)}>
							<div
								className={`grid gap-4 ${
									activeView === "basic" ? "sm:grid-cols-2" : "sm:grid-cols-3"
								}`}
							>
								<FormField
									control={form.control}
									name="ticker"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Crypto Ticker</FormLabel>
											<FormControl>
												<Input placeholder="ETH-USD" {...field} />
											</FormControl>
											<FormDescription>
												Enter the crypto symbol (e.g., BTC-USD, ETH-USD)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="modelType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Model Type</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select model type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="CNN">CNN</SelectItem>
													<SelectItem value="LSTM">LSTM</SelectItem>
													<SelectItem value="CNN-LSTM">CNN-LSTM</SelectItem>
													<SelectItem value="LSTM-CNN">LSTM-CNN</SelectItem>
												</SelectContent>
											</Select>
											<FormDescription>
												Choose the neural network architecture
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="startDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Start Date</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormDescription>
												Training data start date
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="endDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>End Date</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormDescription>Training data end date</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="lookback"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Lookback Days</FormLabel>
											<FormControl>
												<Input type="number" min="10" max="365" {...field} />
											</FormControl>
											<FormDescription>
												Number of days to look back (10-365)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="epochs"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Epochs</FormLabel>
											<FormControl>
												<Input type="number" min="1" max="1000" {...field} />
											</FormControl>
											<FormDescription>
												Number of training epochs (1-1000)
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								{activeView === "advanced" && (
									<>
										<FormField
											control={form.control}
											name="batchSize"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Batch Size</FormLabel>
													<FormControl>
														<Input type="number" min="8" max="256" {...field} />
													</FormControl>
													<FormDescription>
														Training batch size (8-256)
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="learningRate"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Learning Rate</FormLabel>
													<FormControl>
														<Input
															type="number"
															step="0.0001"
															min="0.0001"
															max="0.1"
															{...field}
														/>
													</FormControl>
													<FormDescription>
														Learning rate (0.0001-0.1)
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}

								<div
									className={`${activeView === "basic" ? "sm:col-span-2" : "sm:col-span-3"}`}
								>
									<Button
										type="submit"
										className="w-full items-center"
										disabled={isTraining || !isConnected}
									>
										{isTraining ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Training...
											</>
										) : !isConnected ? (
											<>
												<WifiOff className="mr-2 h-4 w-4" />
												Connect to Start Training
											</>
										) : (
											"Train Model"
										)}
									</Button>
								</div>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}

export default ModelTrainingForm;
