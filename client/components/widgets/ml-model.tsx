"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Database, LineChart, Rocket, Timer, Wrench } from "lucide-react";
import { Widget } from "../ui/widget";
import { useWebSocket } from "@/lib/websocket";
import { useStartTraining } from "@/hooks/use-ml-queries";
import { PlotGrid } from "@/components/charts/plot-grid";
import { useMakePrediction } from "@/hooks/use-ml-queries";
import { getApiUrl } from "@/lib/axios";
import {
	LineChart as ReLineChart,
	Line,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { AreaChart as ReAreaChart, Area } from "recharts";

type MessageRecord = {
	index: number;
	timestamp: string;
	event: string;
	progress?: number;
	session_id?: string;
	data?: Record<string, unknown>;
};

export default function MachineLearningWidget() {
	const { isConnected, onTrainingUpdate, joinTrainingRoom } = useWebSocket();
	const [messages, setMessages] = useState<MessageRecord[]>([]);
	const [autoScroll, setAutoScroll] = useState(true);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [plots, setPlots] = useState<Record<string, string>>({});
	const [seriesMap, setSeriesMap] = useState<Record<string, number[]>>({});

	// Prediction form state
	const [predStartDate, setPredStartDate] = useState<string>("2024-01-02");
	const [predDays, setPredDays] = useState<number>(7);
	const makePrediction = useMakePrediction();
	const [predictionResult, setPredictionResult] = useState<any | null>(null);

	// Simple form state for starting training
	const [ticker, setTicker] = useState<string>("ETH-USD");
	const [modelType, setModelType] = useState<"LSTM" | "CNN" | "CNN-LSTM" | "LSTM-CNN">("LSTM");
	const [startDate, setStartDate] = useState<string>("2023-01-01");
	const [endDate, setEndDate] = useState<string>("2024-01-01");
	const [lookback, setLookback] = useState<number>(60);
	const [epochs, setEpochs] = useState<number>(10);
	const [batchSize, setBatchSize] = useState<number | undefined>(32);
	const [learningRate, setLearningRate] = useState<number | undefined>(0.001);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

	const startTraining = useStartTraining();

	// Subscribe to all training updates and push into the log
	useEffect(() => {
		const unsubscribe = onTrainingUpdate((evt) => {
			const timestamp = (evt.timestamp as string) || new Date().toISOString();
			const eventName = (evt.event as string) || (evt.type as string) || "unknown";
			const progress = (evt.progress as number) ?? undefined;
			const sessionId = (evt.session_id as string) ?? undefined;
			const data = (evt.data as Record<string, unknown>) ?? undefined;

			// Append with a stable, unique index based on current length
			setMessages((prev) => [
				...prev,
				{
					index: prev.length + 1,
					timestamp,
					event: eventName,
					progress,
					session_id: sessionId,
					data,
				},
			]);

			// Capture plot series with URL strings
			try {
				if (
					eventName === "series" &&
					data &&
					typeof data === "object" &&
					(data as any).series
				) {
					const series = (data as any).series as Record<string, unknown>;
					// 1) URL-like entries -> image plots
					const urlEntries = Object.entries(series).filter(([, v]) =>
						typeof v === "string" && /^(https?:\/\/|\/)/.test(v as string),
					) as Array<[string, string]>;
					if (urlEntries.length > 0) {
						setPlots((prev) => ({ ...prev, ...Object.fromEntries(urlEntries) }));
					}
					// 2) Numeric arrays -> raw time series for charts
					const numericEntries = Object.entries(series).filter(([, v]) =>
						Array.isArray(v) && (v as unknown[]).every((n) => typeof n === "number"),
					) as Array<[string, number[]]>;
					if (numericEntries.length > 0) {
						setSeriesMap((prev) => {
							const next = { ...prev, ...Object.fromEntries(numericEntries) };
							if (process.env.NODE_ENV === "development") {
								console.log("seriesMap updated (series event)", Object.keys(next));
							}
							return next;
						});
					}
				}
				// Accumulate metrics from metric_sample/training_progress
				if (eventName === "metric_sample" && data && typeof data === "object") {
					const metrics = (data as any).metrics as Record<string, number> | undefined;
					if (metrics) {
						setSeriesMap((prev) => ({
							...prev,
							accuracy: [...(prev.accuracy || []), ...(typeof metrics.accuracy === "number" ? [metrics.accuracy] : [])],
							loss: [...(prev.loss || []), ...(typeof metrics.loss === "number" ? [metrics.loss] : [])],
						}));
					}
				}
				if (eventName === "training_progress" && data && typeof data === "object") {
					const acc = (data as any).accuracy as number | undefined;
					const loss = (data as any).loss as number | undefined;
					if (typeof acc === "number" || typeof loss === "number") {
						setSeriesMap((prev) => ({
							...prev,
							accuracy: [...(prev.accuracy || []), ...(typeof acc === "number" ? [acc] : [])],
							loss: [...(prev.loss || []), ...(typeof loss === "number" ? [loss] : [])],
						}));
					}
				}
			} catch {}
		});

		return () => unsubscribe?.();
	}, [onTrainingUpdate]);

	// Auto-scroll to the bottom when new messages arrive
	useEffect(() => {
		if (!autoScroll) return;
		const el = containerRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [messages, autoScroll]);

	// Remove misplaced effect (will re-add below isTrainingComplete)

	const connectionBadge = useMemo(
		() => (
			<span
				className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
					isConnected
						? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
						: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
				}`}
			>
				{isConnected ? "Connected" : "Disconnected"}
				{activeSessionId ? <span className="ml-2 text-[10px] opacity-70">{activeSessionId}</span> : null}
			</span>
		),
		[isConnected, activeSessionId],
	);

	// Derived: latest progress and any final metrics
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
				const metrics = (data.metrics as Record<string, number>) || {};
				return {
					final_accuracy: (data.final_accuracy as number) ?? metrics.accuracy,
					final_loss: (data.final_loss as number) ?? metrics.loss,
					r2: metrics.r2,
					mae: metrics.mae,
					rmse: metrics.rmse,
					mape: metrics.mape,
				};
			}
		}
		return null;
	}, [messages]);

	const isTrainingComplete = useMemo(
		() => messages.some((m) => m.event === "training_completed" || m.event === "training_complete"),
		[messages],
	);

	useEffect(() => {
		if (!isTrainingComplete) return;
		if (Object.keys(plots).length > 0) return;
		(async () => {
			try {
				const res = await fetch(getApiUrl('/plots/recent?limit=8'));
				if (res.ok) {
					const json = await res.json();
					if (Array.isArray(json.plots) && json.plots.length > 0) {
						const mapped = Object.fromEntries(
							json.plots.map((url: string, i: number) => [`plot_${i + 1}`, url]),
						);
						setPlots((prev) => ({ ...prev, ...mapped }));
					}
				}
			} catch (err) {
				console.error('Failed to load recent plots', err);
			}
		})();
	}, [isTrainingComplete, plots]);

	// Filtered list: hide noisy training_progress rows (progress is shown in header)
	const displayedMessages = useMemo(
		() => messages.filter((m) => m.event !== "training_progress"),
		[messages],
	);

	// Styling helpers for events
	const eventMeta = (event: string) => {
		switch (event) {
			case "data_fetching":
				return {
					label: "Fetching",
					className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
					Icon: Database,
				};
			case "training_started":
				return {
					label: "Started",
					className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
					Icon: Rocket,
				};
			case "training_progress":
				return {
					label: "Progress",
					className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
					Icon: Timer,
				};
			case "metric_sample":
				return {
					label: "Metrics",
					className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
					Icon: LineChart,
				};
			case "training_completed":
			case "training_complete":
				return {
					label: "Complete",
					className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
					Icon: CheckCircle2,
				};
			default:
				return {
					label: event.replaceAll("_", " "),
					className: "bg-muted text-foreground/80",
					Icon: Wrench,
				};
		}
	};

	// Build a short, descriptive summary for each message
	const getMessageSummary = (m: MessageRecord) => {
		const data = (m.data as Record<string, unknown>) || {};
		if (typeof data.message === "string" && data.message.trim().length > 0) {
			return data.message as string;
		}
		if (m.event === "metric_sample") {
			const epoch = data.epoch as number | undefined;
			const total = data.total_epochs as number | undefined;
			const metrics = data.metrics as Record<string, number> | undefined;
			const acc = metrics?.accuracy;
			const loss = metrics?.loss;
			const parts: string[] = [];
			if (epoch !== undefined && total !== undefined) parts.push(`Epoch ${epoch}/${total}`);
			if (typeof acc === "number") parts.push(`acc ${acc.toFixed(3)}`);
			if (typeof loss === "number") parts.push(`loss ${loss.toFixed(3)}`);
			return parts.join(" • ") || "Metric update";
		}
		if (m.event === "data_fetching") {
			const t = data.ticker as string | undefined;
			const s = data.start_date as string | undefined;
			const e = data.end_date as string | undefined;
			if (t && s && e) return `Fetching ${t} ${s} → ${e}`;
		}
		if (m.event === "training_progress" && typeof m.progress === "number") {
			return `Progress updated to ${Math.round(m.progress)}%`;
		}
		return eventMeta(m.event).label;
	};

	return (
		<Widget
			title="ML Model"
			headerContent={connectionBadge}
			fullHeight
			contentClassName="flex h-full"
		>
			<div className="flex h-full w-full flex-col gap-3">
				{/* Minimal start training form */}
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						try {
							const res = await startTraining.mutateAsync({
								ticker,
								model_type: modelType,
								start_date: startDate,
								end_date: endDate,
								lookback,
								epochs,
								batch_size: batchSize,
								learning_rate: learningRate,
							});
							if (res?.session_id) {
								setActiveSessionId(res.session_id);
								joinTrainingRoom(res.session_id);
								setMessages((prev) => [
									...prev,
									{
										index: prev.length + 1,
										timestamp: new Date().toISOString(),
										event: "training_started",
										data: { session_id: res.session_id, ticker, model_type: modelType },
									},
								]);
							}
						} catch (err) {
							console.error(err);
						}
					}}
					className="grid grid-cols-1 md:grid-cols-7 gap-2 p-2 rounded border bg-muted/20"
				>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Ticker</label>
						<input
							className="h-8 rounded border bg-background px-2 text-sm"
							value={ticker}
							onChange={(e) => setTicker(e.target.value)}
						/>
							</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Model</label>
						<select
							className="h-8 rounded border bg-background px-2 text-sm"
							value={modelType}
							onChange={(e) => setModelType(e.target.value as typeof modelType)}
						>
							<option value="LSTM">LSTM</option>
							<option value="CNN">CNN</option>
							<option value="CNN-LSTM">CNN-LSTM</option>
							<option value="LSTM-CNN">LSTM-CNN</option>
						</select>
				</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Start</label>
						<input
							type="date"
							className="h-8 rounded border bg-background px-2 text-sm"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">End</label>
						<input
							type="date"
							className="h-8 rounded border bg-background px-2 text-sm"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
				</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Lookback</label>
						<input
							type="number"
							min={1}
							className="h-8 rounded border bg-background px-2 text-sm"
							value={lookback}
							onChange={(e) => setLookback(Number(e.target.value))}
							/>
						</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Epochs</label>
						<input
							type="number"
							min={1}
							className="h-8 rounded border bg-background px-2 text-sm"
							value={epochs}
							onChange={(e) => setEpochs(Number(e.target.value))}
									/>
							</div>
					<div className="flex items-end gap-2">
						<button
							type="submit"
							disabled={startTraining.isPending}
							className="h-8 rounded bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
						>
							{startTraining.isPending ? "Starting..." : "Start Training"}
						</button>
								</div>
					{/* Advanced inline controls (kept simple) */}
					<div className="md:col-span-7 grid grid-cols-2 md:grid-cols-6 gap-2">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] text-muted-foreground">Batch</label>
							<input
								type="number"
								min={1}
								className="h-8 rounded border bg-background px-2 text-sm"
								value={batchSize ?? 32}
								onChange={(e) => setBatchSize(Number(e.target.value))}
									/>
								</div>
						<div className="flex flex-col gap-1">
							<label className="text-[11px] text-muted-foreground">Learning Rate</label>
							<input
								type="number"
								step="0.0001"
								min={0}
								className="h-8 rounded border bg-background px-2 text-sm"
								value={learningRate ?? 0.001}
								onChange={(e) => setLearningRate(Number(e.target.value))}
									/>
									</div>
							</div>
				</form>

				{/* Plots (if available) */}
				{Object.keys(plots).length > 0 && (
					<div className="rounded border bg-muted/10 p-2">
						<div className="mb-2 text-xs font-medium">Generated Plots</div>
						<div className="h-[260px] md:h-[320px]">
							<PlotGrid plots={plots} />
									</div>
								</div>
							)}

				{/* Raw Series Charts (Recharts) */}
				{Object.keys(seriesMap).length > 0 && (
					<div className="rounded border bg-muted/10 p-2">
						<div className="mb-2 text-xs font-medium">Training Metrics</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Loss chart */}
							{(seriesMap.loss || seriesMap.val_loss) && (
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<ReLineChart
											data={(seriesMap.loss || seriesMap.val_loss || []).map((_, i) => ({
												idx: i + 1,
												loss: seriesMap.loss ? seriesMap.loss[i] : undefined,
												val_loss: seriesMap.val_loss ? seriesMap.val_loss[i] : undefined,
											}))}
											margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
											<YAxis tick={{ fontSize: 10 }} />
											<Tooltip />
											<Legend />
											{seriesMap.loss && (
												<Line type="monotone" dataKey="loss" stroke="#ef4444" dot={false} name="Loss" />
											)}
											{seriesMap.val_loss && (
												<Line type="monotone" dataKey="val_loss" stroke="#3b82f6" dot={false} name="Val Loss" />
											)}
										</ReLineChart>
									</ResponsiveContainer>
										</div>
								)}
							{/* Accuracy chart */}
							{(seriesMap.accuracy || seriesMap.val_accuracy) && (
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<ReLineChart
											data={(seriesMap.accuracy || seriesMap.val_accuracy || []).map((_, i) => ({
												idx: i + 1,
												accuracy: seriesMap.accuracy ? seriesMap.accuracy[i] : undefined,
												val_accuracy: seriesMap.val_accuracy ? seriesMap.val_accuracy[i] : undefined,
											}))}
											margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
											<YAxis tick={{ fontSize: 10 }} />
											<Tooltip />
											<Legend />
											{seriesMap.accuracy && (
												<Line type="monotone" dataKey="accuracy" stroke="#10b981" dot={false} name="Accuracy" />
											)}
											{seriesMap.val_accuracy && (
												<Line type="monotone" dataKey="val_accuracy" stroke="#a855f7" dot={false} name="Val Accuracy" />
											)}
										</ReLineChart>
									</ResponsiveContainer>
										</div>
							)}

							{/* Rolling metrics chart (MAE / RMSE) */}
							{(seriesMap.mae || seriesMap.rmse) && (
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<ReLineChart
											data={(seriesMap.mae || seriesMap.rmse || []).map((_, i) => ({
												idx: i + 1,
												mae: seriesMap.mae ? seriesMap.mae[i] : undefined,
												rmse: seriesMap.rmse ? seriesMap.rmse[i] : undefined,
											}))}
											margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
											<YAxis tick={{ fontSize: 10 }} />
											<Tooltip />
											<Legend />
											{seriesMap.mae && (
												<Line type="monotone" dataKey="mae" stroke="#0ea5e9" dot={false} name="MAE" />
											)}
											{seriesMap.rmse && (
												<Line type="monotone" dataKey="rmse" stroke="#f59e0b" dot={false} name="RMSE" />
											)}
										</ReLineChart>
									</ResponsiveContainer>
									</div>
								)}

							{/* Predictions vs Actuals */}
							{(seriesMap.original_prices || seriesMap.train_pred || seriesMap.test_pred) && (
								<div className="h-64 md:col-span-2">
									<ResponsiveContainer width="100%" height="100%">
										<ReLineChart
											data={(() => {
												const orig = seriesMap.original_prices || [];
												const mean = (seriesMap as any).mean as number | undefined;
												const std = (seriesMap as any).std as number | undefined;
												const trainSize = (seriesMap as any).train_size as number | undefined;
												const lookback = (seriesMap as any).lookback as number | undefined;
												const trainPred = seriesMap.train_pred || [];
												const testPred = seriesMap.test_pred || [];
												const len = Math.max(orig.length, (trainSize || 0) + testPred.length, (lookback || 0) + trainPred.length);
												const dn = (v?: number) => (v !== undefined && mean !== undefined && std !== undefined ? v * std + mean : v);
												const dataArr: Array<any> = [];
												for (let i = 0; i < len; i++) {
													const row: any = { idx: i + 1 };
													if (i < orig.length) row.actual = orig[i];
													const tpIdx = i - (lookback || 0);
													if (tpIdx >= 0 && tpIdx < trainPred.length) row.train = dn(trainPred[tpIdx]);
													const spIdx = i - (trainSize || 0);
													if (spIdx >= 0 && spIdx < testPred.length) row.test = dn(testPred[spIdx]);
													dataArr.push(row);
												}
												return dataArr;
											})()}
											margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
											<YAxis tick={{ fontSize: 10 }} />
											<Tooltip />
											<Legend />
											{seriesMap.original_prices && (
												<Line type="monotone" dataKey="actual" stroke="#64748b" dot={false} name="Actual" />
											)}
											{seriesMap.train_pred && (
												<Line type="monotone" dataKey="train" stroke="#22c55e" dot={false} name="Train Pred" />
											)}
											{seriesMap.test_pred && (
												<Line type="monotone" dataKey="test" stroke="#3b82f6" dot={false} name="Test Pred" />
											)}
										</ReLineChart>
									</ResponsiveContainer>
									</div>
								)}

							{/* Confidence intervals */}
							{(seriesMap as any).ci_pred && (seriesMap as any).ci_lower && (seriesMap as any).ci_upper && (
								<div className="h-64 md:col-span-2">
									<ResponsiveContainer width="100%" height="100%">
										<ReAreaChart
											data={((seriesMap as any).ci_pred as number[]).map((_, i) => ({
												idx: i + 1,
												pred: (seriesMap as any).ci_pred[i],
												lower: (seriesMap as any).ci_lower[i],
												upper: (seriesMap as any).ci_upper[i],
											}))}
											margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
											<YAxis tick={{ fontSize: 10 }} />
											<Tooltip />
											<Legend />
											<Area type="monotone" dataKey="lower" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} name="Lower" />
											<Area type="monotone" dataKey="upper" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} name="Upper" />
											<Line type="monotone" dataKey="pred" stroke="#0ea5e9" dot={false} name="Prediction" />
										</ReAreaChart>
									</ResponsiveContainer>
									</div>
							)}

											</div>
										</div>
												)}
				<div className="flex items-center justify-between gap-2">
					<div className="text-sm text-muted-foreground">
						Training updates will appear below.
											</div>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-1 text-xs text-muted-foreground">
							<input
								type="checkbox"
								checked={autoScroll}
								onChange={(e) => setAutoScroll(e.target.checked)}
							/>
							Auto-scroll
						</label>
										<button
							onClick={() => setMessages([])}
							className="rounded border px-2 py-1 text-xs hover:bg-muted"
						>
							Clear
										</button>
									</div>
								</div>

				{/* Status header */}
				<div className="rounded border bg-muted/10 p-2">
					<div className="mb-1 flex items-center justify-between text-xs">
						<span className="font-medium">Status</span>
						<span className="text-muted-foreground">{latestProgress}%</span>
							</div>
					<div className="h-2 w-full overflow-hidden rounded bg-muted">
						<div
							className="h-2 bg-primary transition-[width] duration-300"
							style={{ width: `${Math.min(100, Math.max(0, latestProgress))}%` }}
						/>
							</div>

					{finalMetrics && (
						<div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
							<div className="rounded bg-green-50 dark:bg-green-950/30 p-2 text-center">
								<div className="text-sm font-semibold text-green-700 dark:text-green-300">
									{finalMetrics.final_accuracy !== undefined
										? finalMetrics.final_accuracy.toFixed(4)
																		: "N/A"}
											</div>
								<div className="text-[11px] text-muted-foreground">Accuracy</div>
										</div>
							<div className="rounded bg-red-50 dark:bg-red-950/30 p-2 text-center">
								<div className="text-sm font-semibold text-red-700 dark:text-red-300">
									{finalMetrics.final_loss !== undefined
										? finalMetrics.final_loss.toFixed(4)
										: "N/A"}
											</div>
								<div className="text-[11px] text-muted-foreground">Loss</div>
										</div>
							{finalMetrics.r2 !== undefined && (
								<div className="rounded bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
									<div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
										{finalMetrics.r2.toFixed(4)}
											</div>
									<div className="text-[11px] text-muted-foreground">R²</div>
										</div>
									)}
										</div>
									)}
								</div>

				<div
					ref={containerRef}
					className="relative min-h-[200px] flex-1 overflow-auto rounded border bg-muted/20"
				>
					<ul className="divide-y">
						{displayedMessages.map((m) => {
							const meta = eventMeta(m.event);
							const Icon = meta.Icon;
							const summary = getMessageSummary(m);
							return (
								<li key={m.index} className="p-2">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-2">
											<span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${meta.className}`}>
												<Icon className="h-3 w-3" />
												{meta.label}
											</span>
														</div>
										<span className="shrink-0 text-[11px] text-muted-foreground">
											{new Date(m.timestamp).toLocaleTimeString()}
										</span>
													</div>

									{summary && (
										<div className="mt-1 text-xs text-foreground/90">
											{summary}
								</div>
							)}

									{m.data && Object.keys(m.data).length > 0 && (
										<details className="mt-2 group">
											<summary className="cursor-pointer list-none text-[11px] text-muted-foreground transition-colors hover:text-foreground">
												Payload
											</summary>
											<pre className="mt-1 rounded bg-background p-2 text-[11px] leading-relaxed">
												{JSON.stringify(m.data, null, 2)}
											</pre>
										</details>
									)}
								</li>
							);
						})}
					</ul>
								</div>

				{/* Predict form */}
				{isTrainingComplete && (
					<form
					onSubmit={async (e) => {
						e.preventDefault();
						try {
							const result = await makePrediction.mutateAsync({
								ticker,
								start_date: predStartDate,
								days: Number(predDays),
							});
							setPredictionResult(result);
						} catch (err) {
							console.error(err);
						}
					}}
					className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 p-2 rounded border bg-muted/20"
				>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Prediction Start</label>
						<input
							type="date"
							className="h-8 rounded border bg-background px-2 text-sm"
							value={predStartDate}
							onChange={(e) => setPredStartDate(e.target.value)}
						/>
								</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] text-muted-foreground">Days</label>
						<input
							type="number"
							min={1}
							max={60}
							className="h-8 rounded border bg-background px-2 text-sm"
							value={predDays}
							onChange={(e) => setPredDays(Number(e.target.value))}
						/>
								</div>
					<div className="flex items-end">
								<button
							type="submit"
							disabled={makePrediction.isPending}
							className="h-8 rounded bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
						>
							{makePrediction.isPending ? "Predicting..." : "Predict"}
								</button>
							</div>
				</form>
				)}

							{predictionResult && predictionResult?.data?.predictions && (
					<div className="mt-2 rounded border bg-muted/10 p-2">
						<div className="mb-2 text-xs font-medium">
							{predictionResult.data.ticker} • {predictionResult.data.predictions.length} predictions
									</div>
						<div className="max-h-48 overflow-auto text-xs">
							{predictionResult.data.predictions.slice(0, 20).map((p: any, i: number) => (
								<div key={i} className="flex items-center justify-between border-b last:border-b-0 py-1">
									<span className="text-muted-foreground">{p.date}</span>
									<span className="font-medium">${(p.price ?? p.predicted_price ?? 0).toFixed(2)}</span>
											</div>
							))}
										</div>
					</div>
				)}
			</div>
		</Widget>
	);
}
