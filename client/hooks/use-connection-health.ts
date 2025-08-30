"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useModelSocket } from "./use-socket";

interface ConnectionMetrics {
  uptime: number;
  downtime: number;
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averageReconnectionTime: number;
  lastReconnectionTime: number;
}

interface ConnectionHealth {
  isHealthy: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  score: number; // 0-100
  recommendations: string[];
}

const HEALTH_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 50,
  POOR: 25,
};

const MAX_RECONNECTION_ATTEMPTS = 5;

export function useConnectionHealth() {
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    connectionAttempts,
    lastConnectedAt,
    lastDisconnectedAt,
    error,
  } = useModelSocket();

  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    uptime: 0,
    downtime: 0,
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageReconnectionTime: 0,
    lastReconnectionTime: 0,
  });

  const [health, setHealth] = useState<ConnectionHealth>({
    isHealthy: true,
    quality: 'excellent',
    score: 100,
    recommendations: [],
  });

  // Refs for tracking
  const connectionStartTimeRef = useRef<number | null>(null);
  const disconnectionStartTimeRef = useRef<number | null>(null);
  const reconnectionStartTimeRef = useRef<number | null>(null);
  const reconnectionTimesRef = useRef<number[]>([]);

  // Calculate connection quality score
  const calculateHealthScore = useCallback((): number => {
    let score = 100;

    // Deduct points for failed connections
    if (metrics.totalConnections > 0 && metrics.failedConnections > 0) {
      const failureRate = metrics.failedConnections / metrics.totalConnections;
      score -= failureRate * 30; // Up to 30 points for connection failures
    }

    // Deduct points for excessive reconnection attempts
    if (connectionAttempts > 0) {
      score -= Math.min(connectionAttempts * 5, 20); // Up to 20 points for reconnection attempts
    }

    // Deduct points for long reconnection times
    if (metrics.averageReconnectionTime > 5000) {
      score -= Math.min((metrics.averageReconnectionTime - 5000) / 1000, 15); // Up to 15 points for slow reconnections
    }

    // Deduct points for current errors
    if (error) {
      score -= 10;
    }

    // Deduct points for reconnection state
    if (isReconnecting) {
      score -= 5;
    }

    return Math.max(0, Math.round(score));
  }, [metrics, connectionAttempts, error, isReconnecting]);

  // Determine connection quality
  const getConnectionQuality = useCallback((score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= HEALTH_THRESHOLDS.GOOD) return 'good';
    if (score >= HEALTH_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback((score: number, quality: string): string[] => {
    const recommendations: string[] = [];

    if (score < HEALTH_THRESHOLDS.EXCELLENT) {
      if (metrics.failedConnections > 0) {
        recommendations.push('Check server availability and network connectivity');
      }
      if (metrics.averageReconnectionTime > 5000) {
        recommendations.push('Consider optimizing network latency or server response time');
      }
      if (connectionAttempts > 2) {
        recommendations.push('Review reconnection strategy and error handling');
      }
    }

    if (quality === 'poor') {
      recommendations.push('Connection quality is poor. Consider checking server logs and network configuration');
    }

    if (error) {
      recommendations.push('Clear current error and attempt reconnection');
    }

    return recommendations;
  }, [metrics, connectionAttempts, error]);

  // Update metrics when connection state changes
  useEffect(() => {
    const now = Date.now();

    if (isConnected && !connectionStartTimeRef.current) {
      // Connection established
      connectionStartTimeRef.current = now;
      disconnectionStartTimeRef.current = null;
      
      setMetrics(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        successfulConnections: prev.successfulConnections + 1,
      }));

      // Calculate reconnection time if this was a reconnection
      if (reconnectionStartTimeRef.current) {
        const reconnectionTime = now - reconnectionStartTimeRef.current;
        reconnectionTimesRef.current.push(reconnectionTime);
        
        setMetrics(prev => ({
          ...prev,
          lastReconnectionTime: reconnectionTime,
          averageReconnectionTime: reconnectionTimesRef.current.reduce((a, b) => a + b, 0) / reconnectionTimesRef.current.length,
        }));
        
        reconnectionStartTimeRef.current = null;
      }
    } else if (!isConnected && connectionStartTimeRef.current) {
      // Connection lost
      const uptime = now - connectionStartTimeRef.current;
      connectionStartTimeRef.current = null;
      disconnectionStartTimeRef.current = now;
      
      setMetrics(prev => ({
        ...prev,
        uptime: prev.uptime + uptime,
      }));
    }

    if (isReconnecting && !reconnectionStartTimeRef.current) {
      reconnectionStartTimeRef.current = now;
    }
  }, [isConnected, isReconnecting]);

  // Track failed connections when reconnection attempts are exhausted
  useEffect(() => {
    if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS && !isConnected) {
      setMetrics(prev => ({
        ...prev,
        failedConnections: prev.failedConnections + 1,
      }));
    }
  }, [connectionAttempts, isConnected]);

  // Update health when metrics change
  useEffect(() => {
    const score = calculateHealthScore();
    const quality = getConnectionQuality(score);
    const recommendations = generateRecommendations(score, quality);

    setHealth({
      isHealthy: score >= HEALTH_THRESHOLDS.FAIR,
      quality,
      score,
      recommendations,
    });
  }, [metrics, connectionAttempts, error, isReconnecting, calculateHealthScore, getConnectionQuality, generateRecommendations]);

  // Update downtime when disconnected
  useEffect(() => {
    if (!isConnected && disconnectionStartTimeRef.current) {
      const interval = setInterval(() => {
        const now = Date.now();
        const downtime = now - disconnectionStartTimeRef.current!;
        
        setMetrics(prev => ({
          ...prev,
          downtime: prev.downtime + 1000, // Add 1 second
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

  // Calculate uptime percentage
  const getUptimePercentage = useCallback((): number => {
    const total = metrics.uptime + metrics.downtime;
    if (total === 0) return 100;
    return Math.round((metrics.uptime / total) * 100);
  }, [metrics.uptime, metrics.downtime]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      uptime: 0,
      downtime: 0,
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageReconnectionTime: 0,
      lastReconnectionTime: 0,
    });
    reconnectionTimesRef.current = [];
  }, []);

  return {
    metrics,
    health,
    uptimePercentage: getUptimePercentage(),
    resetMetrics,
  };
}
