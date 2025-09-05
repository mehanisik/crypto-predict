import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTraining } from "@/lib/actions";
import { useMlModelStore } from "@/store";
import trainingSchema from "@/schemas/model-training";
import type { z } from "zod";
import { Step } from "@/types/ml-model";
import { TrainingPresets } from "@/constants/training-presets.constant";

export function ConfigureModelStep() {
	const training = useMlModelStore((s) => s.training);
	const setTraining = useMlModelStore((s) => s.setTraining);
	const setConnection = useMlModelStore((s) => s.setConnection);
	const setStep = useMlModelStore((s) => s.setStep);

	type FormValues = z.infer<typeof trainingSchema>;

	const applyPreset = (preset: (typeof TrainingPresets)[0]) => {
		if (preset.config) {
			Object.entries(preset.config).forEach(([key, value]) => {
				form.setValue(key as keyof FormValues, value as any, {
					shouldValidate: true,
				});
			});
		}
	};

	const form = useForm<FormValues>({
		resolver: zodResolver(trainingSchema),
		defaultValues: {
			ticker: training.ticker,
			modelType: training.modelType,
			startDate: training.startDate,
			endDate: training.endDate,
			lookback: training.lookback,
			epochs: training.epochs,
			batchSize: training.batchSize ?? 32,
			learningRate: training.learningRate ?? 0.001,
		},
		mode: "onChange",
	});

	const onSubmit = async (values: FormValues) => {
		try {
			setTraining(values);
			const payload = {
				ticker: values.ticker,
				model_type: values.modelType,
				start_date: values.startDate,
				end_date: values.endDate,
				lookback: values.lookback,
				epochs: values.epochs,
				batch_size: values.batchSize ?? 32,
				learning_rate: values.learningRate ?? 0.001,
			} as any;
			const data = await startTraining(payload);
			if (data?.session_id) {
				setConnection({ activeSessionId: data.session_id });
				setStep(Step.Train);
			}
		} catch (e: any) {
			form.setError("root", {
				type: "server",
				message: e?.message || "Failed to start training",
			});
		}
	};

	return (
		<div className="space-y-4">
			{form.formState.errors.root?.message && (
				<Alert variant="destructive">
					<AlertDescription>
						{form.formState.errors.root?.message}
					</AlertDescription>
				</Alert>
			)}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm">Training Presets</CardTitle>
					<CardDescription className="text-xs">
						Choose a preset configuration or configure manually
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
						{TrainingPresets.map((preset) => {
							const Icon = preset.icon;
							return (
								<button
									key={preset.name}
									type="button"
									onClick={() => applyPreset(preset)}
									className="flex flex-col items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
								>
									<Icon className="h-5 w-5 mb-2 text-muted-foreground" />
									<div className="text-xs font-medium">{preset.name}</div>
									<div className="text-[10px] text-muted-foreground mt-1">
										{preset.description}
									</div>
								</button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label htmlFor="ticker" className="text-xs">
							Ticker
						</Label>
						<Input
							id="ticker"
							{...form.register("ticker")}
							placeholder="ETH-USD"
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="model_type" className="text-xs">
							Model Type
						</Label>
						<Select
							value={form.watch("modelType")}
							onValueChange={(v) =>
								form.setValue("modelType", v as FormValues["modelType"], {
									shouldValidate: true,
								})
							}
							name="model_type"
						>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="LSTM">LSTM</SelectItem>
								<SelectItem value="CNN">CNN</SelectItem>
								<SelectItem value="CNN-LSTM">CNN-LSTM</SelectItem>
								<SelectItem value="LSTM-CNN">LSTM-CNN</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="start_date" className="text-xs">
							Start Date
						</Label>
						<Input
							id="start_date"
							type="date"
							{...form.register("startDate")}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="end_date" className="text-xs">
							End Date
						</Label>
						<Input
							id="end_date"
							type="date"
							{...form.register("endDate")}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="lookback" className="text-xs">
							Lookback
						</Label>
						<Input
							id="lookback"
							type="number"
							min={1}
							{...form.register("lookback", { valueAsNumber: true })}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="epochs" className="text-xs">
							Epochs
						</Label>
						<Input
							id="epochs"
							type="number"
							min={1}
							{...form.register("epochs", { valueAsNumber: true })}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="batch_size" className="text-xs">
							Batch Size
						</Label>
						<Input
							id="batch_size"
							type="number"
							min={1}
							{...form.register("batchSize", { valueAsNumber: true })}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="learning_rate" className="text-xs">
							Learning Rate
						</Label>
						<Input
							id="learning_rate"
							type="number"
							step="0.0001"
							min={0}
							{...form.register("learningRate", { valueAsNumber: true })}
							className="h-8 text-sm"
						/>
					</div>
				</div>
				<div className="flex justify-end">
					<Button disabled={form.formState.isSubmitting} type="submit">
						{form.formState.isSubmitting ? "Starting..." : "Start Training"}
					</Button>
				</div>
			</form>
		</div>
	);
}
