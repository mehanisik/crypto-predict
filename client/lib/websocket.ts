"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TrainingUpdateEvent } from '@/types/socket';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

// Re-export types from the types file
export type { TrainingUpdateEvent as TrainingUpdate } from '@/types/socket';

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
  const maxReconnectAttempts = 10;
  const reconnectDelay = 1000;
  const isManualDisconnectRef = useRef(false);
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const scheduleReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts || isManualDisconnectRef.current) {
      setState(prev => ({
        ...prev,
        error: `Failed to reconnect after ${maxReconnectAttempts} attempts`,
        isConnecting: false
      }));
      return;
    }
    
    clearReconnectTimer();
    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000);
    
    console.log(`🔄 Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    console.log('🔌 Attempting WebSocket connection...');
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const socket = io(WS_URL, {
      path: '/socket.io/',
      withCredentials: false,
      transports: ['websocket', 'polling'],
      upgrade: true,
      autoConnect: true,
      reconnection: false,
      timeout: 15000, // Increased timeout
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnectedAt: new Date(),
        connectionAttempts: 0,
      }));
      reconnectAttemptsRef.current = 0;
      isManualDisconnectRef.current = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        lastDisconnectedAt: new Date(),
      }));
      
      if (!isManualDisconnectRef.current && (reason === 'transport close' || reason === 'io server disconnect')) {
        scheduleReconnection();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message,
        lastDisconnectedAt: new Date(),
      }));
      
      if (!isManualDisconnectRef.current) {
        scheduleReconnection();
      }
    });

    socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'WebSocket error occurred',
      }));
    });

    socket.on('training_update', (data: TrainingUpdateEvent) => {
      console.log('📡 Training update received:', data);
      window.dispatchEvent(new CustomEvent('training_update', { detail: data }));
    });

    // Listen for all stage events from the server
    const stageEvents = [
      'data_fetching', 'data_fetched', 'preprocessing', 'feature_engineering',
      'model_building', 'model_info', 'training_update', 'evaluating_update', 'visualizing_update'
    ];

    stageEvents.forEach(eventName => {
      socket.on(eventName, (data: Record<string, unknown>) => {
        console.log(`📡 ${eventName} event received:`, data);
        // Dispatch as training_update with the event type included
        window.dispatchEvent(new CustomEvent('training_update', { 
          detail: { 
            ...data, 
            type: eventName,
            session_id: (data.session_id as string) || ((data.data as Record<string, unknown>)?.session_id as string)
          } 
        }));
      });
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ WebSocket reconnected after ${attemptNumber} attempts`);
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastConnectedAt: new Date(),
      }));
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
      setState(prev => ({
        ...prev,
        isConnecting: true,
        connectionAttempts: attemptNumber,
      }));
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
      setState(prev => ({
        ...prev,
        error: `Reconnection failed: ${error.message}`,
      }));
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after all attempts');
      setState(prev => ({
        ...prev,
        error: 'Failed to reconnect after all attempts',
        isConnecting: false,
      }));
    });
  }, [scheduleReconnection]);

  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket');
    isManualDisconnectRef.current = true;
    clearReconnectTimer();
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false,
      error: null 
    }));
  }, []);

  const reconnect = useCallback(() => {
    console.log('🔄 Manually reconnecting WebSocket');
    isManualDisconnectRef.current = false;
    disconnect();
    reconnectAttemptsRef.current = 0;
    
    // Small delay to ensure disconnect is complete
    setTimeout(() => {
      connect();
    }, 100);
  }, [disconnect, connect]);

  const joinTrainingRoom = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      const roomKey = `training_${sessionId}`;
      
      // Check if already in this room to prevent duplicate joins
      if (joinedRoomsRef.current.has(roomKey)) {
        console.log(`🎯 Already in training room: ${sessionId}`);
        return;
      }
      
      console.log(`🎯 Joining training room: ${sessionId}`);
      socketRef.current.emit('join_training', { session_id: sessionId });
      joinedRoomsRef.current.add(roomKey);
    } else {
      console.warn('⚠️ Cannot join training room: WebSocket not connected');
    }
  }, []);

  const leaveTrainingRoom = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      const roomKey = `training_${sessionId}`;
      console.log(`🚪 Leaving training room: ${sessionId}`);
      socketRef.current.emit('leave_training', { session_id: sessionId });
      joinedRoomsRef.current.delete(roomKey);
    }
  }, []);



  const onTrainingUpdate = useCallback((callback: (data: TrainingUpdateEvent) => void) => {
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
    return () => { 
      disconnect(); 
    };
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
