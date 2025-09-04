"use client";

import { useMarketStats } from "@/hooks/use-market-queries";
import { useHealth, useRunningTrainings } from "@/hooks/use-ml-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function QueryDemo() {
	// Example of using the market stats hook
	const marketStatsQuery = useMarketStats();

	// Example of using the health hook
	const healthQuery = useHealth();

	// Example of using the running trainings hook
	const runningTrainingsQuery = useRunningTrainings();

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold">React Query Demo</h2>

			{/* Market Stats Example */}
			<Card>
				<CardHeader>
					<CardTitle>Market Stats</CardTitle>
					<Badge variant={marketStatsQuery.isLoading ? "secondary" : "default"}>
						{marketStatsQuery.isLoading ? "Loading..." : "Ready"}
					</Badge>
				</CardHeader>
				<CardContent>
					{marketStatsQuery.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : marketStatsQuery.error ? (
						<div className="text-red-500">
							Error: {marketStatsQuery.error.message}
						</div>
					) : (
						<div>
							<p>
								Loaded {marketStatsQuery.data?.length || 0} cryptocurrencies
							</p>
							<p className="text-sm text-muted-foreground">
								Last updated:{" "}
								{marketStatsQuery.dataUpdatedAt
									? new Date(
											marketStatsQuery.dataUpdatedAt,
										).toLocaleTimeString()
									: "Never"}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Health Check Example */}
			<Card>
				<CardHeader>
					<CardTitle>API Health</CardTitle>
					<Badge
						variant={
							healthQuery.isLoading
								? "secondary"
								: healthQuery.data?.status === "healthy"
									? "default"
									: "destructive"
						}
					>
						{healthQuery.isLoading
							? "Checking..."
							: healthQuery.data?.status || "Unknown"}
					</Badge>
				</CardHeader>
				<CardContent>
					{healthQuery.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : healthQuery.error ? (
						<div className="text-red-500">
							Error: {healthQuery.error.message}
						</div>
					) : (
						<div>
							<p>Status: {healthQuery.data?.status}</p>
							<p>Version: {healthQuery.data?.version}</p>
							<p>Uptime: {healthQuery.data?.uptime}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Running Trainings Example */}
			<Card>
				<CardHeader>
					<CardTitle>Running Trainings</CardTitle>
					<Badge
						variant={runningTrainingsQuery.isLoading ? "secondary" : "default"}
					>
						{runningTrainingsQuery.isLoading
							? "Loading..."
							: `${runningTrainingsQuery.data?.count || 0} active`}
					</Badge>
				</CardHeader>
				<CardContent>
					{runningTrainingsQuery.isLoading ? (
						<Skeleton className="h-20 w-full" />
					) : runningTrainingsQuery.error ? (
						<div className="text-red-500">
							Error: {runningTrainingsQuery.error.message}
						</div>
					) : (
						<div>
							<p>Active trainings: {runningTrainingsQuery.data?.count || 0}</p>
							<p>
								Max sessions: {runningTrainingsQuery.data?.max_sessions || 0}
							</p>
							{runningTrainingsQuery.data?.running_trainings?.map(
								(training, index) => (
									<div
										key={training.session_id}
										className="text-sm mt-2 p-2 bg-muted rounded"
									>
										<p>
											<strong>{training.ticker}</strong> - {training.model_type}
										</p>
										<p className="text-muted-foreground">
											Status: {training.status}
										</p>
									</div>
								),
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Query States Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Query States</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 gap-4 text-sm">
						<div>
							<p className="font-medium">Market Stats:</p>
							<p>Loading: {marketStatsQuery.isLoading ? "Yes" : "No"}</p>
							<p>Error: {marketStatsQuery.error ? "Yes" : "No"}</p>
							<p>Stale: {marketStatsQuery.isStale ? "Yes" : "No"}</p>
						</div>
						<div>
							<p className="font-medium">Health:</p>
							<p>Loading: {healthQuery.isLoading ? "Yes" : "No"}</p>
							<p>Error: {healthQuery.error ? "Yes" : "No"}</p>
							<p>Stale: {healthQuery.isStale ? "Yes" : "No"}</p>
						</div>
						<div>
							<p className="font-medium">Trainings:</p>
							<p>Loading: {runningTrainingsQuery.isLoading ? "Yes" : "No"}</p>
							<p>Error: {runningTrainingsQuery.error ? "Yes" : "No"}</p>
							<p>Stale: {runningTrainingsQuery.isStale ? "Yes" : "No"}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
