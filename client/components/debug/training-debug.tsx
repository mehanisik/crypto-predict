"use client";

import { useWebSocket } from "@/lib/websocket";
import { useConnectionHealth } from "@/hooks/use-connection-health";
import { useHealth } from "@/hooks/use-ml-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TrainingDebug() {
	const { isConnected, isConnecting, error, connectionAttempts } =
		useWebSocket();
	const { health } = useConnectionHealth();
	const {
		data: apiHealth,
		isLoading: apiHealthLoading,
		error: apiHealthError,
	} = useHealth();
	const [logs, setLogs] = useState<string[]>([]);

	const addLog = (message: string) => {
		setLogs((prev) => [
			...prev,
			`${new Date().toLocaleTimeString()}: ${message}`,
		]);
	};

	const testConnection = () => {
		addLog("Testing WebSocket connection...");
		addLog(`Connected: ${isConnected}`);
		addLog(`Connecting: ${isConnecting}`);
		addLog(`Error: ${error || "None"}`);
		addLog(`Attempts: ${connectionAttempts}`);
	};

	const testApiHealth = async () => {
		addLog("Testing API health...");
		if (apiHealthLoading) {
			addLog("API health loading...");
		} else if (apiHealthError) {
			addLog(`API health error: ${apiHealthError.message}`);
		} else if (apiHealth) {
			addLog(`API health: ${apiHealth.status}`);
			addLog(`API version: ${apiHealth.version}`);
			addLog(`API uptime: ${apiHealth.uptime}`);
		}
	};

	const clearLogs = () => {
		setLogs([]);
	};

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					🔧 Training Debug Panel
					<Badge variant={isConnected ? "default" : "destructive"}>
						{isConnected ? "Connected" : "Disconnected"}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Connection Status */}
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<div className="font-medium">WebSocket Status</div>
						<div>Connected: {isConnected ? "✅" : "❌"}</div>
						<div>Connecting: {isConnecting ? "🔄" : "⏸️"}</div>
						<div>Attempts: {connectionAttempts}</div>
						{error && <div className="text-red-600">Error: {error}</div>}
					</div>
					<div>
						<div className="font-medium">Connection Health</div>
						<div>Quality: {health?.quality}</div>
						<div>Score: {health?.score}/100</div>
						<div>Healthy: {health?.isHealthy ? "✅" : "❌"}</div>
					</div>
				</div>

				{/* API Health */}
				<div className="text-sm">
					<div className="font-medium">API Health</div>
					{apiHealthLoading ? (
						<div>Loading...</div>
					) : apiHealthError ? (
						<div className="text-red-600">Error: {apiHealthError.message}</div>
					) : apiHealth ? (
						<div>
							<div>Status: {apiHealth.status}</div>
							<div>Version: {apiHealth.version}</div>
							<div>Uptime: {apiHealth.uptime}</div>
						</div>
					) : (
						<div>No data</div>
					)}
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<Button onClick={testConnection} variant="outline" size="sm">
						Test WebSocket
					</Button>
					<Button onClick={testApiHealth} variant="outline" size="sm">
						Test API Health
					</Button>
					<Button onClick={clearLogs} variant="outline" size="sm">
						Clear Logs
					</Button>
				</div>

				{/* Debug Logs */}
				<div className="text-sm">
					<div className="font-medium mb-2">Debug Logs</div>
					<div className="bg-muted p-3 rounded max-h-40 overflow-y-auto font-mono text-xs">
						{logs.length === 0 ? (
							<div className="text-muted-foreground">
								No logs yet. Click test buttons above.
							</div>
						) : (
							logs.map((log, index) => (
								<div key={index} className="mb-1">
									{log}
								</div>
							))
						)}
					</div>
				</div>

				{/* Recommendations */}
				<div className="text-sm">
					<div className="font-medium mb-2">Troubleshooting</div>
					<div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded text-xs">
						<div className="font-medium mb-1">If training is stuck:</div>
						<ul className="list-disc list-inside space-y-1">
							<li>Check if WebSocket is connected (should show ✅)</li>
							<li>Check API health status (should be "healthy")</li>
							<li>Look for errors in browser console</li>
							<li>Check server logs for training issues</li>
							<li>Try refreshing the connection</li>
						</ul>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
