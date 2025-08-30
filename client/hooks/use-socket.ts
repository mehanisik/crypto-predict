"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { ModelStages } from "@/constants/model-stages.constant";
import { TrainingUpdateResponse } from "@/types/training-update";
import { EvaluatingUpdateResponse } from "@/types/evaluating-update";
import { VisualizingUpdateResponse } from "@/types/visualizing-update";

const SOCKET_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace('http', 'ws') || "ws://localhost:5000";

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
}

interface WebSocketError {
  message: string;
  code?: string;
  timestamp: Date;
  retryable: boolean;
}

const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000; // Start with 1 second
const MAX_RECONNECTION_DELAY = 30000; // Max 30 seconds

export function useModelSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    connectionAttempts: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  });
  
  const [error, setError] = useState<WebSocketError | null>(null);
  const [progressData, setProgressData] = useState<{
    training?: TrainingUpdateResponse;
    evaluating?: EvaluatingUpdateResponse;
    visualizing?: VisualizingUpdateResponse;
  }>({});

  const [currentStage, setCurrentStage] = useState<ModelStages>(
    ModelStages.PARAMETERS
  );
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  // Refs for managing connection state
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  // Enhanced error handling
  const handleError = useCallback((error: WebSocketError) => {
    setError(error);
    console.error('WebSocket Error:', error);
    
    // Auto-reconnect for retryable errors
    if (error.retryable && !isManualDisconnectRef.current) {
      scheduleReconnection();
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      handleError({
        message: 'Max reconnection attempts reached',
        code: 'MAX_RECONNECT_ATTEMPTS',
        timestamp: new Date(),
        retryable: false,
      });
      return;
    }

    const delay = Math.min(
      RECONNECTION_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECTION_DELAY
    );

    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      connectionAttempts: reconnectAttemptsRef.current + 1,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, []);

  // Clear reconnection timeout
  const clearReconnectionTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connection function
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      isConnecting: true,
      isReconnecting: false,
    }));

    try {
      const socket = io(SOCKET_URL, {
        transports: ["websocket"],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
        reconnectionAttempts: 0,
        reconnectionDelay: 0,
        reconnectionDelayMax: 0,
      });

      socketRef.current = socket;

      // Connection events
      socket.on("connect", () => {
        console.log("✅ Connected to WebSocket server");
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          connectionAttempts: 0,
        }));
        setError(null);
        reconnectAttemptsRef.current = 0;
        clearReconnectionTimeout();
      });

      socket.on("connect_error", (err) => {
        console.error("❌ Connection error:", err);
        const wsError: WebSocketError = {
          message: `Connection failed: ${err.message}`,
          code: err.message,
          timestamp: new Date(),
          retryable: true,
        };
        
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
          lastDisconnectedAt: new Date(),
        }));
        
        handleError(wsError);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔌 Disconnected:", reason);
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
          lastDisconnectedAt: new Date(),
        }));

        // Auto-reconnect for unexpected disconnections
        if (reason === 'io server disconnect' || reason === 'transport close') {
          if (!isManualDisconnectRef.current) {
            scheduleReconnection();
          }
        }
      });

      socket.on("error", (err) => {
        console.error("🚨 Socket error:", err);
        handleError({
          message: `Socket error: ${err.message || 'Unknown error'}`,
          code: 'SOCKET_ERROR',
          timestamp: new Date(),
          retryable: true,
        });
      });

      // Progress update events
      socket.on("training_update", handleTrainingUpdate);
      socket.on("evaluating_update", handleEvaluationUpdate);
      socket.on("visualizing_update", handleVisualizationUpdate);
      socket.on("connected", (data) => {
        console.log("🔗 Server acknowledged connection:", data);
      });

    } catch (err) {
      const wsError: WebSocketError = {
        message: `Failed to create socket: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'SOCKET_CREATION_ERROR',
        timestamp: new Date(),
        retryable: true,
      };
      handleError(wsError);
    }
  }, [SOCKET_URL, handleError, scheduleReconnection, clearReconnectionTimeout]);

  // Disconnect function
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectionTimeout();
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
    }));
  }, [clearReconnectionTimeout]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    isManualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    clearReconnectionTimeout();
    disconnect();
    
    // Small delay before reconnecting
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect, clearReconnectionTimeout]);

  // Event handlers
  const handleTrainingUpdate = useCallback((data: TrainingUpdateResponse) => {
    setProgressData((prev) => ({ ...prev, training: data }));
    setCurrentStage(ModelStages.TRAINING);
    setCurrentProgress(data.data.progress);
  }, []);

  const handleEvaluationUpdate = useCallback(
    (data: EvaluatingUpdateResponse) => {
      setProgressData((prev) => ({ ...prev, evaluating: data }));
      setCurrentStage(ModelStages.EVALUATING);
      setCurrentProgress(data.data.progress);
    },
    []
  );

  const handleVisualizationUpdate = useCallback(
    (data: VisualizingUpdateResponse) => {
      setProgressData((prev) => ({ ...prev, visualizing: data }));
      setCurrentStage(ModelStages.VISUALIZING);
      setCurrentProgress(data.data.progress);
      if (data.data.progress === 100) setCurrentStage(ModelStages.PREDICTING);
    },
    []
  );

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReconnectionTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [clearReconnectionTimeout]);

  const resetState = useCallback(() => {
    setProgressData({});
    setError(null);
    setCurrentStage(ModelStages.PARAMETERS);
    setCurrentProgress(0);
  }, []);

  const isStageComplete = useCallback(
    (stage: ModelStages) => {
      const stageOrder = Object.values(ModelStages);
      const currentIndex = stageOrder.indexOf(currentStage);
      const stageIndex = stageOrder.indexOf(stage);
      return currentIndex > stageIndex;
    },
    [currentStage]
  );

  // Connection status helpers
  const getConnectionStatus = useCallback(() => {
    if (connectionState.isConnected) return 'connected';
    if (connectionState.isConnecting) return 'connecting';
    if (connectionState.isReconnecting) return 'reconnecting';
    return 'disconnected';
  }, [connectionState]);

  const getConnectionStatusText = useCallback(() => {
    switch (getConnectionStatus()) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return `Reconnecting... (${connectionState.connectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})`;
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  }, [getConnectionStatus, connectionState.connectionAttempts]);

  return {
    // Connection state
    isConnected: connectionState.isConnected,
    isConnecting: connectionState.isConnecting,
    isReconnecting: connectionState.isReconnecting,
    connectionAttempts: connectionState.connectionAttempts,
    lastConnectedAt: connectionState.lastConnectedAt,
    lastDisconnectedAt: connectionState.lastDisconnectedAt,
    
    // Connection status
    connectionStatus: getConnectionStatus(),
    connectionStatusText: getConnectionStatusText(),
    
    // Error handling
    error,
    clearError: () => setError(null),
    
    // Progress data
    progressData,
    currentStage,
    currentProgress,
    setCurrentStage,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    resetState,
    isStageComplete,
    
    // Socket reference (for advanced usage)
    socket: socketRef.current,
  };
}
