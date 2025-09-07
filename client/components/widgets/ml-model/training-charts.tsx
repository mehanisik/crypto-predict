"use client";

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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Activity } from "lucide-react";

import { useMlModelStore } from "@/store";

export function TrainingCharts() {
	const seriesMap = useMlModelStore((s) => s.seriesMap);

	const hasMetrics = Object.keys(seriesMap).length > 0;

	if (!hasMetrics) {
		return (
			<Card className="h-full">
				<CardContent className="flex items-center justify-center h-full min-h-[300px]">
					<div className="text-center text-muted-foreground">
						<BarChart3 className="h-8 w-8 mx-auto mb-2" />
						<p className="text-sm">
							Charts will appear here once training begins
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="h-full flex flex-col space-y-4">
			<Card className="flex-1 min-h-0">
				<CardHeader className="pb-4 flex-shrink-0">
					<CardTitle className="text-base flex items-center gap-2">
						<TrendingUp className="h-4 w-4" />
						Training Metrics
						{hasMetrics && (
							<Badge variant="secondary" className="ml-1">
								{Object.keys(seriesMap).length}
							</Badge>
						)}
					</CardTitle>
					<CardDescription className="text-sm">
						Real-time loss and accuracy metrics
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 min-h-0">
					<div className="h-full overflow-auto space-y-6">
						{(seriesMap.loss || seriesMap.val_loss || seriesMap.accuracy || seriesMap.val_accuracy) && (
							<Tabs defaultValue="loss" className="w-full">
								<TabsList className="grid w-full grid-cols-2">
									{(seriesMap.loss || seriesMap.val_loss) && (
										<TabsTrigger value="loss" className="flex items-center gap-2">
											<Activity className="h-4 w-4 text-red-500" />
											Loss Metrics
										</TabsTrigger>
									)}
									{(seriesMap.accuracy || seriesMap.val_accuracy) && (
										<TabsTrigger value="accuracy" className="flex items-center gap-2">
											<TrendingUp className="h-4 w-4 text-green-500" />
											Accuracy Metrics
										</TabsTrigger>
									)}
								</TabsList>
								
								{(seriesMap.loss || seriesMap.val_loss) && (
									<TabsContent value="loss" className="mt-4">
										<Card>
											<CardHeader className="pb-3">
												<CardTitle className="text-sm flex items-center gap-2">
													<Activity className="h-4 w-4 text-red-500" />
													Loss Metrics
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="h-80">
													<ResponsiveContainer width="100%" height="100%">
														<ReLineChart
															data={(
																seriesMap.loss ||
																seriesMap.val_loss ||
																[]
															).map((_, i) => ({
																epoch: i + 1,
																loss: seriesMap.loss
																	? seriesMap.loss[i]
																	: undefined,
																val_loss: seriesMap.val_loss
																	? seriesMap.val_loss[i]
																	: undefined,
															}))}
															margin={{
																top: 10,
																right: 20,
																left: 10,
																bottom: 10,
															}}
														>
															<CartesianGrid strokeDasharray="3 3" />
															<XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
															<YAxis tick={{ fontSize: 10 }} />
															<Tooltip />
															<Legend />
															{seriesMap.loss && (
																<Line
																	type="monotone"
																	dataKey="loss"
																	stroke="#ef4444"
																	strokeWidth={2}
																	dot={false}
																	name="Training Loss"
																/>
															)}
															{seriesMap.val_loss && (
																<Line
																	type="monotone"
																	dataKey="val_loss"
																	stroke="#3b82f6"
																	strokeWidth={2}
																	dot={false}
																	name="Validation Loss"
																/>
															)}
														</ReLineChart>
													</ResponsiveContainer>
												</div>
											</CardContent>
										</Card>
									</TabsContent>
								)}

								{(seriesMap.accuracy || seriesMap.val_accuracy) && (
									<TabsContent value="accuracy" className="mt-4">
										<Card>
											<CardHeader className="pb-3">
												<CardTitle className="text-sm flex items-center gap-2">
													<TrendingUp className="h-4 w-4 text-green-500" />
													Accuracy Metrics
												</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="h-80">
													<ResponsiveContainer width="100%" height="100%">
														<ReLineChart
															data={(
																seriesMap.accuracy ||
																seriesMap.val_accuracy ||
																[]
															).map((_, i) => ({
																epoch: i + 1,
																accuracy: seriesMap.accuracy
																	? seriesMap.accuracy[i]
																	: undefined,
																val_accuracy: seriesMap.val_accuracy
																	? seriesMap.val_accuracy[i]
																	: undefined,
															}))}
															margin={{
																top: 10,
																right: 20,
																left: 10,
																bottom: 10,
															}}
														>
															<CartesianGrid strokeDasharray="3 3" />
															<XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
															<YAxis tick={{ fontSize: 10 }} />
															<Tooltip />
															<Legend />
															{seriesMap.accuracy && (
																<Line
																	type="monotone"
																	dataKey="accuracy"
																	stroke="#10b981"
																	strokeWidth={2}
																	dot={false}
																	name="Training Accuracy"
																/>
															)}
															{seriesMap.val_accuracy && (
																<Line
																	type="monotone"
																	dataKey="val_accuracy"
																	stroke="#a855f7"
																	strokeWidth={2}
																	dot={false}
																	name="Validation Accuracy"
																/>
															)}
														</ReLineChart>
													</ResponsiveContainer>
												</div>
											</CardContent>
										</Card>
									</TabsContent>
								)}
							</Tabs>
						)}

						{(seriesMap.mae || seriesMap.rmse) && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm flex items-center gap-2">
										<Activity className="h-4 w-4 text-orange-500" />
										Error Metrics
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-72">
										<ResponsiveContainer width="100%" height="100%">
											<ReLineChart
												data={(seriesMap.mae || seriesMap.rmse || []).map(
													(_, i) => ({
														epoch: i + 1,
														mae: seriesMap.mae ? seriesMap.mae[i] : undefined,
														rmse: seriesMap.rmse
															? seriesMap.rmse[i]
															: undefined,
													}),
												)}
												margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="epoch" tick={{ fontSize: 10 }} />
												<YAxis tick={{ fontSize: 10 }} />
												<Tooltip />
												<Legend />
												{seriesMap.mae && (
													<Line
														type="monotone"
														dataKey="mae"
														stroke="#0ea5e9"
														strokeWidth={2}
														dot={false}
														name="MAE"
													/>
												)}
												{seriesMap.rmse && (
													<Line
														type="monotone"
														dataKey="rmse"
														stroke="#f59e0b"
														strokeWidth={2}
														dot={false}
														name="RMSE"
													/>
												)}
											</ReLineChart>
										</ResponsiveContainer>
									</div>
								</CardContent>
							</Card>
						)}
						{(seriesMap.original_prices ||
							seriesMap.train_pred ||
							seriesMap.test_pred) && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm flex items-center gap-2">
										<TrendingUp className="h-4 w-4 text-blue-500" />
										Predictions vs Actual Prices
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="h-80">
										<ResponsiveContainer width="100%" height="100%">
											<ReLineChart
												data={(() => {
													const orig = seriesMap.original_prices || [];
													const mean = (seriesMap as any).mean as
														| number
														| undefined;
													const std = (seriesMap as any).std as
														| number
														| undefined;
													const trainSize = (seriesMap as any).train_size as
														| number
														| undefined;
													const lookback = (seriesMap as any).lookback as
														| number
														| undefined;
													const trainPred = seriesMap.train_pred || [];
													const testPred = seriesMap.test_pred || [];
													const len = Math.max(
														orig.length,
														(trainSize || 0) + testPred.length,
														(lookback || 0) + trainPred.length,
													);
													const dn = (v?: number) =>
														v !== undefined &&
														mean !== undefined &&
														std !== undefined
															? v * std + mean
															: v;
													const dataArr: Array<any> = [];
													for (let i = 0; i < len; i++) {
														const row: any = { idx: i + 1 };
														if (i < orig.length) row.actual = orig[i];
														const tpIdx = i - (lookback || 0);
														if (tpIdx >= 0 && tpIdx < trainPred.length)
															row.train = dn(trainPred[tpIdx]);
														const spIdx = i - (trainSize || 0);
														if (spIdx >= 0 && spIdx < testPred.length)
															row.test = dn(testPred[spIdx]);
														dataArr.push(row);
													}
													return dataArr;
												})()}
												margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
												<YAxis tick={{ fontSize: 10 }} />
												<Tooltip />
												<Legend />
												{seriesMap.original_prices && (
													<Line
														type="monotone"
														dataKey="actual"
														stroke="#64748b"
														strokeWidth={2}
														dot={false}
														name="Actual Price"
													/>
												)}
												{seriesMap.train_pred && (
													<Line
														type="monotone"
														dataKey="train"
														stroke="#22c55e"
														strokeWidth={2}
														dot={false}
														name="Training Predictions"
													/>
												)}
												{seriesMap.test_pred && (
													<Line
														type="monotone"
														dataKey="test"
														stroke="#3b82f6"
														strokeWidth={2}
														dot={false}
														name="Test Predictions"
													/>
												)}
											</ReLineChart>
										</ResponsiveContainer>
									</div>
								</CardContent>
							</Card>
						)}

						{(seriesMap as any).ci_pred &&
							(seriesMap as any).ci_lower &&
							(seriesMap as any).ci_upper && (
								<Card>
									<CardHeader className="pb-3">
										<CardTitle className="text-sm flex items-center gap-2">
											<Activity className="h-4 w-4 text-purple-500" />
											Confidence Intervals
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="h-80">
											<ResponsiveContainer width="100%" height="100%">
												<ReAreaChart
													data={((seriesMap as any).ci_pred as number[]).map(
														(_, i) => ({
															idx: i + 1,
															pred: (seriesMap as any).ci_pred[i],
															lower: (seriesMap as any).ci_lower[i],
															upper: (seriesMap as any).ci_upper[i],
														}),
													)}
													margin={{
														top: 10,
														right: 20,
														left: 10,
														bottom: 10,
													}}
												>
													<CartesianGrid strokeDasharray="3 3" />
													<XAxis dataKey="idx" tick={{ fontSize: 10 }} />
													<YAxis tick={{ fontSize: 10 }} />
													<Tooltip />
													<Legend />
													<Area
														type="monotone"
														dataKey="lower"
														stroke="#94a3b8"
														fill="#94a3b8"
														fillOpacity={0.2}
														name="Lower Bound"
													/>
													<Area
														type="monotone"
														dataKey="upper"
														stroke="#94a3b8"
														fill="#94a3b8"
														fillOpacity={0.2}
														name="Upper Bound"
													/>
													<Line
														type="monotone"
														dataKey="pred"
														stroke="#0ea5e9"
														strokeWidth={2}
														dot={false}
														name="Prediction"
													/>
												</ReAreaChart>
											</ResponsiveContainer>
										</div>
									</CardContent>
								</Card>
							)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
