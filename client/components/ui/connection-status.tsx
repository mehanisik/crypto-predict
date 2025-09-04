"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	AlertCircle,
	CheckCircle,
	RefreshCw,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useModelSocket } from "@/hooks/use-socket";

interface ConnectionStatusProps {
	showDetails?: boolean;
	className?: string;
}

export function ConnectionStatus({
	showDetails = false,
	className = "",
}: ConnectionStatusProps) {
	const {
		connectionStatus,
		connectionStatusText,
		isConnected,
		isConnecting,
		isReconnecting,
		connectionAttempts,
		lastConnectedAt,
		lastDisconnectedAt,
		error,
		clearError,
		reconnect,
		disconnect,
	} = useModelSocket();

	const getStatusIcon = () => {
		if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
		if (isConnecting)
			return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
		if (isReconnecting)
			return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
		return <WifiOff className="h-4 w-4 text-red-500" />;
	};

	const getStatusColor = () => {
		switch (connectionStatus) {
			case "connected":
				return "bg-green-100 text-green-800 border-green-200";
			case "connecting":
				return "bg-blue-100 text-blue-800 border-blue-200";
			case "reconnecting":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "disconnected":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const formatTimestamp = (date: Date | null) => {
		if (!date) return "Never";
		return new Intl.DateTimeFormat("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).format(date);
	};

	if (!showDetails) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				{getStatusIcon()}
				<Badge variant="outline" className={getStatusColor()}>
					{connectionStatusText}
				</Badge>
				{error && (
					<Button
						variant="ghost"
						size="sm"
						onClick={clearError}
						className="h-6 px-2 text-xs"
					>
						Clear Error
					</Button>
				)}
			</div>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Wifi className="h-4 w-4" />
					WebSocket Connection
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Status Display */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						{getStatusIcon()}
						<span className="text-sm font-medium">{connectionStatusText}</span>
					</div>
					<Badge variant="outline" className={getStatusColor()}>
						{connectionStatus}
					</Badge>
				</div>

				{/* Connection Details */}
				<div className="space-y-2 text-xs text-muted-foreground">
					<div className="flex justify-between">
						<span>Last Connected:</span>
						<span>{formatTimestamp(lastConnectedAt)}</span>
					</div>
					<div className="flex justify-between">
						<span>Last Disconnected:</span>
						<span>{formatTimestamp(lastDisconnectedAt)}</span>
					</div>
					{isReconnecting && (
						<div className="flex justify-between">
							<span>Reconnection Attempts:</span>
							<span>{connectionAttempts}/5</span>
						</div>
					)}
				</div>

				{/* Error Display */}
				{error && (
					<div className="rounded-md bg-red-50 p-3 border border-red-200">
						<div className="flex items-start gap-2">
							<AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium text-red-800">
									{error.message}
								</p>
								{error.code && (
									<p className="text-xs text-red-600 mt-1">
										Code: {error.code}
									</p>
								)}
								<p className="text-xs text-red-600 mt-1">
									{new Intl.DateTimeFormat("en-US", {
										hour: "2-digit",
										minute: "2-digit",
										second: "2-digit",
									}).format(error.timestamp)}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-2 pt-2">
					{isConnected ? (
						<Button
							variant="outline"
							size="sm"
							onClick={disconnect}
							className="flex-1"
						>
							Disconnect
						</Button>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={reconnect}
							disabled={isConnecting || isReconnecting}
							className="flex-1"
						>
							{isReconnecting ? "Reconnecting..." : "Connect"}
						</Button>
					)}

					{error && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearError}
							className="flex-1"
						>
							Clear Error
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
