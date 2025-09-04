"use client";

import {
	useRunningTrainings,
	useHealth,
	useTrainingStatus,
} from "@/hooks/use-ml-queries";
import { Widget } from "@/components/ui/widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Activity,
	CheckCircle,
	Clock,
	TrendingUp,
	AlertCircle,
	Wifi,
	WifiOff,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function TrainingDashboard() {
	const {
		data: runningTrainings,
		isLoading: trainingsLoading,
		error: trainingsError,
	} = useRunningTrainings();
	const {
		data: health,
		isLoading: healthLoading,
		error: healthError,
	} = useHealth();

	return (
		<Widget title="Training Dashboard" fullHeight={true}>
			<div className="space-y-4">
				{/* Health Status */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							{healthLoading ? (
								<Skeleton className="h-4 w-4 rounded-full" />
							) : healthError ? (
								<AlertCircle className="h-4 w-4 text-red-500" />
							) : health?.status === "healthy" ? (
								<Wifi className="h-4 w-4 text-green-500" />
							) : (
								<WifiOff className="h-4 w-4 text-red-500" />
							)}
							API Health
						</CardTitle>
					</CardHeader>
					<CardContent>
						{healthLoading ? (
							<Skeleton className="h-6 w-full" />
						) : healthError ? (
							<div className="text-red-500 text-sm">
								Failed to fetch health status
							</div>
						) : (
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Status</span>
									<Badge
										variant={
											health?.status === "healthy" ? "default" : "destructive"
										}
									>
										{health?.status || "Unknown"}
									</Badge>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Version</span>
									<span className="text-sm font-mono">
										{health?.version || "N/A"}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Uptime</span>
									<span className="text-sm">{health?.uptime || "N/A"}</span>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Active Trainings */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Activity className="h-4 w-4 text-blue-500" />
							Active Trainings (
							{trainingsLoading ? "..." : runningTrainings?.count || 0})
						</CardTitle>
					</CardHeader>
					<CardContent>
						{trainingsLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : trainingsError ? (
							<div className="text-red-500 text-sm">
								Failed to fetch training data
							</div>
						) : runningTrainings?.running_trainings?.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p className="text-sm">No active training sessions</p>
							</div>
						) : (
							<div className="space-y-3">
								{runningTrainings?.running_trainings?.map((training) => (
									<TrainingCard key={training.session_id} training={training} />
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* System Stats */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">System Overview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-blue-600">
									{runningTrainings?.count || 0}
								</div>
								<div className="text-xs text-muted-foreground">
									Active Sessions
								</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-green-600">
									{runningTrainings?.max_sessions || 0}
								</div>
								<div className="text-xs text-muted-foreground">
									Max Sessions
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</Widget>
	);
}

function TrainingCard({ training }: { training: any }) {
	const { data: status, isLoading } = useTrainingStatus(training.session_id);

	return (
		<div className="border rounded-lg p-3 space-y-2">
			<div className="flex justify-between items-start">
				<div>
					<div className="font-medium text-sm">{training.ticker}</div>
					<div className="text-xs text-muted-foreground">
						{training.model_type}
					</div>
				</div>
				<Badge
					variant={training.status === "COMPLETED" ? "default" : "secondary"}
				>
					{training.status}
				</Badge>
			</div>

			{isLoading ? (
				<Skeleton className="h-2 w-full" />
			) : status?.progress ? (
				<div className="space-y-1">
					<div className="flex justify-between text-xs">
						<span>Progress</span>
						<span>{Math.round(status.progress.percentage)}%</span>
					</div>
					<Progress value={status.progress.percentage} className="h-2" />
				</div>
			) : null}

			{training.accuracy !== null && (
				<div className="flex justify-between items-center text-xs">
					<span className="text-muted-foreground">Accuracy</span>
					<span className="font-medium text-green-600">
						{formatNumber(training.accuracy)}
					</span>
				</div>
			)}

			{training.loss !== null && (
				<div className="flex justify-between items-center text-xs">
					<span className="text-muted-foreground">Loss</span>
					<span className="font-medium text-red-600">
						{formatNumber(training.loss)}
					</span>
				</div>
			)}

			<div className="text-xs text-muted-foreground">
				Started: {new Date(training.started_at).toLocaleTimeString()}
			</div>
		</div>
	);
}
