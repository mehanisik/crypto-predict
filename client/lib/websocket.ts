"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost';

export interface TrainingUpdate {
  session_id: string;
  type: string;
  message: string;
  progress?: number;
  accuracy?: number;
  loss?: number;
  current_epoch?: number;
  total_epochs?: number;
  epoch?: number;
  final_accuracy?: number;
  final_loss?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  connectionAttempts: number;
}

export const useWebSocket = () => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    connectionAttempts: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const scheduleReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) return;
    clearReconnectTimer();
    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(WS_URL, {
      path: '/socket.io/',
      withCredentials: false,
      transports: ['websocket'],
      upgrade: false,
      autoConnect: true,
      reconnection: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnectedAt: new Date(),
        connectionAttempts: 0,
      }));
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        lastDisconnectedAt: new Date(),
      }));
      if (reason === 'transport close' || reason === 'io server disconnect') scheduleReconnection();
    });

    socket.on('connect_error', (error) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
        lastDisconnectedAt: new Date(),
      }));
      scheduleReconnection();
    });

    socket.on('training_update', (data: TrainingUpdate) => {
      window.dispatchEvent(new CustomEvent('training_update', { detail: data }));
    });
  }, [scheduleReconnection]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  const joinTrainingRoom = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) socketRef.current.emit('join_training', { session_id: sessionId });
  }, []);

  const leaveTrainingRoom = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) socketRef.current.emit('leave_training', { session_id: sessionId });
  }, []);

  const onTrainingUpdate = useCallback((callback: (data: TrainingUpdate) => void) => {
    const handler = (event: CustomEvent) => callback(event.detail);
    window.addEventListener('training_update', handler as EventListener);
    return () => window.removeEventListener('training_update', handler as EventListener);
  }, []);

  const getConnectionStatus = useCallback(() => ({
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastConnectedAt: state.lastConnectedAt,
    lastDisconnectedAt: state.lastDisconnectedAt,
    connectionAttempts: state.connectionAttempts,
  }), [state]);

  useEffect(() => {
    connect();
    return () => { disconnect(); };
  }, [connect, disconnect]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    lastConnectedAt: state.lastConnectedAt,
    lastDisconnectedAt: state.lastDisconnectedAt,
    connectionAttempts: state.connectionAttempts,
    connect,
    disconnect,
    reconnect,
    joinTrainingRoom,
    leaveTrainingRoom,
    onTrainingUpdate,
    getConnectionStatus,
  };
};

export const webSocketService = {
  // Legacy no-op
};
