"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";

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
  score: number;
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
    error,
    connectionAttempts,
    lastConnectedAt,
    lastDisconnectedAt,
  } = useWebSocket();

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

  const connectionStartTimeRef = useRef<number | null>(null);
  const disconnectionStartTimeRef = useRef<number | null>(null);
  const reconnectionStartTimeRef = useRef<number | null>(null);
  const reconnectionTimesRef = useRef<number[]>([]);

  const calculateHealthScore = useCallback((): number => {
    let score = 100;

    if (metrics.totalConnections > 0 && metrics.failedConnections > 0) {
      const failureRate = metrics.failedConnections / metrics.totalConnections;
      score -= failureRate * 30;
    }

    if (connectionAttempts > 0) {
      score -= Math.min(connectionAttempts * 5, 20);
    }

    if (metrics.averageReconnectionTime > 5000) {
      score -= Math.min((metrics.averageReconnectionTime - 5000) / 1000, 15);
    }

    if (error) {
      score -= 10;
    }

    if (isConnecting) {
      score -= 5;
    }

    return Math.max(0, Math.round(score));
  }, [metrics, connectionAttempts, error, isConnecting]);

  const getConnectionQuality = useCallback((score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= HEALTH_THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= HEALTH_THRESHOLDS.GOOD) return 'good';
    if (score >= HEALTH_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }, []);

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

  useEffect(() => {
    const now = Date.now();

    if (isConnected && !connectionStartTimeRef.current) {
      connectionStartTimeRef.current = now;
      disconnectionStartTimeRef.current = null;
      
      setMetrics(prev => ({
        ...prev,
        totalConnections: prev.totalConnections + 1,
        successfulConnections: prev.successfulConnections + 1,
      }));

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
      const uptime = now - connectionStartTimeRef.current;
      connectionStartTimeRef.current = null;
      disconnectionStartTimeRef.current = now;
      
      setMetrics(prev => ({
        ...prev,
        uptime: prev.uptime + uptime,
      }));
    }

    if (isConnecting && !reconnectionStartTimeRef.current) {
      reconnectionStartTimeRef.current = now;
    }
  }, [isConnected, isConnecting]);

  useEffect(() => {
    if (connectionAttempts >= MAX_RECONNECTION_ATTEMPTS && !isConnected) {
      setMetrics(prev => ({
        ...prev,
        failedConnections: prev.failedConnections + 1,
      }));
    }
  }, [connectionAttempts, isConnected]);

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
  }, [metrics, connectionAttempts, error, isConnecting, calculateHealthScore, getConnectionQuality, generateRecommendations]);

  useEffect(() => {
    if (!isConnected && disconnectionStartTimeRef.current) {
      const interval = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          downtime: prev.downtime + 1000,
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getUptimePercentage = useCallback((): number => {
    const total = metrics.uptime + metrics.downtime;
    if (total === 0) return 100;
    return Math.round((metrics.uptime / total) * 100);
  }, [metrics.uptime, metrics.downtime]);

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
