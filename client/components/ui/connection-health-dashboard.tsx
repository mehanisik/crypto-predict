"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Wifi,
  WifiOff,
  Timer
} from "lucide-react";
import { useConnectionHealth } from "@/hooks/use-connection-health";
import { useModelSocket } from "@/hooks/use-socket";

interface ConnectionHealthDashboardProps {
  className?: string;
}

export function ConnectionHealthDashboard({ className = "" }: ConnectionHealthDashboardProps) {
  const { metrics, health, uptimePercentage, resetMetrics } = useConnectionHealth();
  const { 
    isConnected, 
    isConnecting, 
    isReconnecting, 
    connectionAttempts,
    lastConnectedAt,
    lastDisconnectedAt 
  } = useModelSocket();

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  const formatTimestamp = (date: Date | null): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getHealthColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'fair': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'poor': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Connection Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(health.quality)}
              <div>
                <p className="font-medium">Connection Quality</p>
                <p className="text-sm text-muted-foreground">
                  {health.quality.charAt(0).toUpperCase() + health.quality.slice(1)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={getHealthColor(health.quality)}>
              Score: {health.score}/100
            </Badge>
          </div>

          <Progress value={health.score} className="h-2" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <span>Uptime:</span>
              <span className="font-medium">{uptimePercentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span>Status:</span>
              <span className="font-medium">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting' : isReconnecting ? 'Reconnecting' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Connection Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Connections</p>
                <p className="font-medium">{metrics.totalConnections}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Successful</p>
                <p className="font-medium text-green-600">{metrics.successfulConnections}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="font-medium text-red-600">{metrics.failedConnections}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Attempts</p>
                <p className="font-medium">{connectionAttempts}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Timing Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">{formatDuration(metrics.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downtime</span>
                <span className="font-medium">{formatDuration(metrics.downtime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Reconnect</span>
                <span className="font-medium">{formatDuration(metrics.averageReconnectionTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Reconnect</span>
                <span className="font-medium">{formatDuration(metrics.lastReconnectionTime)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Connection History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Last Connected</p>
              <p className="font-medium">{formatTimestamp(lastConnectedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Disconnected</p>
              <p className="font-medium">{formatTimestamp(lastDisconnectedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {health.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {health.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetMetrics}
              className="flex-1"
            >
              Reset Metrics
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
