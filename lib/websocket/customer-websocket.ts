'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CustomerWebSocketEvent =
  | {
      type: 'job_update';
      jobId: string;
      updateType: 'progress' | 'completed' | 'failed';
      status: string;
      progress?: number | null;
      currentLayer?: number | null;
      totalLayers?: number | null;
      etaMinutes?: number | null;
      errorMessage?: string | null;
      message?: string;
      sequence: number;
      timestamp: string;
    }
  | {
      type: 'job_status_changed';
      jobId: string;
      newStatus: string;
      message: string;
      sequence: number;
      timestamp: string;
    }
  | {
      type: 'connected';
      customerId: string;
      sequence: number;
      timestamp: string;
      message: string;
    }
  | {
      type: 'pong';
      sequence: number;
      timestamp: string;
    }
  | {
      type: 'subscribed';
      sequence: number;
      timestamp: string;
      message: string;
    }
  | {
      type: 'error';
      message: string;
    };

type CustomerWebSocketCallbacks = {
  onJobUpdate?: (
    jobId: string,
    updateType: 'progress' | 'completed' | 'failed',
    data: {
      status: string;
      progress?: number | null;
      currentLayer?: number | null;
      totalLayers?: number | null;
      etaMinutes?: number | null;
      errorMessage?: string | null;
      message?: string;
    },
  ) => void;
  onJobStatusChanged?: (
    jobId: string,
    newStatus: string,
    message: string,
  ) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseCustomerWebSocketOptions {
  accessToken?: string;
  enabled?: boolean;
  callbacks?: CustomerWebSocketCallbacks;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface UseCustomerWebSocketReturn {
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  subscribe: () => void;
  sendPing: () => void;
  isConnected: boolean;
}

const DEFAULT_OPTIONS: Partial<UseCustomerWebSocketOptions> = {
  enabled: true,
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
};

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace('http', 'ws') || 'ws://localhost:4000';

/**
 * CS-09: Custom hook for connecting to the customer WebSocket gateway for real-time job updates
 * Provides reconnect-safe delivery with sequence numbers
 *
 * @example
 * ```tsx
 * const { connectionState, isConnected } = useCustomerWebSocket({
 *   accessToken: session?.accessToken,
 *   callbacks: {
 *     onJobUpdate: (jobId, updateType, data) => {
 *       console.log(`Job ${jobId} ${updateType}: ${data.progress}%`);
 *       setJobProgress(data.progress);
 *     },
 *     onJobStatusChanged: (jobId, newStatus) => {
 *       toast.success(`Job ${jobId} is now ${newStatus}`);
 *     },
 *   },
 * });
 * ```
 */
export function useCustomerWebSocket(
  options: UseCustomerWebSocketOptions = {},
): UseCustomerWebSocketReturn {
  const {
    accessToken,
    enabled = DEFAULT_OPTIONS.enabled,
    callbacks = {},
    autoReconnect = DEFAULT_OPTIONS.autoReconnect,
    reconnectDelay = DEFAULT_OPTIONS.reconnectDelay,
    maxReconnectAttempts = DEFAULT_OPTIONS.maxReconnectAttempts,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef<CustomerWebSocketCallbacks>(callbacks);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastSequenceRef = useRef(0); // Track last sequence for reconnect safety

  const isConnected = connectionState === 'connected';

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;

      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close(1000, 'Cleanup');
      }
      wsRef.current = null;
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: CustomerWebSocketEvent = JSON.parse(event.data);
        const { type } = data;

        switch (type) {
          case 'job_update':
            // Track sequence number for reconnect safety
            if (data.sequence > lastSequenceRef.current) {
              lastSequenceRef.current = data.sequence;
            }

            if (callbacksRef.current.onJobUpdate) {
              callbacksRef.current.onJobUpdate(data.jobId, data.updateType, {
                status: data.status,
                progress: data.progress,
                currentLayer: data.currentLayer,
                totalLayers: data.totalLayers,
                etaMinutes: data.etaMinutes,
                errorMessage: data.errorMessage,
                message: data.message,
              });
            }
            break;

          case 'job_status_changed':
            if (data.sequence > lastSequenceRef.current) {
              lastSequenceRef.current = data.sequence;
            }

            if (callbacksRef.current.onJobStatusChanged) {
              callbacksRef.current.onJobStatusChanged(
                data.jobId,
                data.newStatus,
                data.message,
              );
            }
            break;

          case 'connected':
            console.log('Customer WebSocket connected:', data.customerId);
            break;

          case 'pong':
            // Heartbeat acknowledged
            break;

          case 'subscribed':
            console.log('Successfully subscribed to customer WebSocket updates');
            break;

          case 'error':
            console.error('WebSocket error:', data.message);
            if (callbacksRef.current.onError) {
              callbacksRef.current.onError(data.message);
            }
            break;

          default:
            console.warn('Unknown WebSocket message type:', type, data);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    },
    [],
  );

  const handleOpen = useCallback(() => {
    if (!isMountedRef.current) return;

    console.log('Customer WebSocket connected');
    setConnectionState('connected');
    reconnectAttemptsRef.current = 0;

    // Send subscribe message with last sequence for reconnect-safe delivery
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          lastSequence: lastSequenceRef.current,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (callbacksRef.current.onConnected) {
      callbacksRef.current.onConnected();
    }
  }, []);

  const handleClose = useCallback(
    (event: CloseEvent) => {
      if (!isMountedRef.current) return;

      console.log('Customer WebSocket disconnected:', event.code, event.reason);
      setConnectionState('disconnected');

      cleanup();

      if (callbacksRef.current.onDisconnected) {
        callbacksRef.current.onDisconnected();
      }

      // Attempt reconnection if not a normal closure and auto-reconnect is enabled
      if (
        autoReconnect &&
        enabled &&
        event.code !== 1000 && // Normal closure
        reconnectAttemptsRef.current < maxReconnectAttempts!
      ) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          reconnectDelay! * Math.pow(1.5, reconnectAttemptsRef.current - 1),
          30000, // Max 30 seconds
        );

        console.log(
          `Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, delay);
      }
    },
    [autoReconnect, enabled, reconnectDelay, maxReconnectAttempts, cleanup],
  );

  const handleError = useCallback(() => {
    if (!isMountedRef.current) return;

    console.error('Customer WebSocket error');
    setConnectionState('error');

    if (callbacksRef.current.onError) {
      callbacksRef.current.onError('WebSocket connection error');
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled || !accessToken) return;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return; // Already connected or connecting
    }

    cleanup();
    setConnectionState('connecting');

    const encodedToken = encodeURIComponent(accessToken);
    const wsUrl = `${WS_URL}/ws/frontend?token=${encodedToken}`;
    console.log('Connecting to customer WebSocket:', wsUrl);

    try {
      wsRef.current = new WebSocket(wsUrl);

      // Set up event handlers
      wsRef.current.addEventListener('open', handleOpen);
      wsRef.current.addEventListener('close', handleClose);
      wsRef.current.addEventListener('error', handleError);
      wsRef.current.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [
    enabled,
    accessToken,
    cleanup,
    handleOpen,
    handleClose,
    handleError,
    handleMessage,
  ]);

  const disconnect = useCallback(() => {
    isMountedRef.current = false;
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  const subscribe = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'subscribe',
        lastSequence: lastSequenceRef.current,
        timestamp: new Date().toISOString(),
      }),
    );
  }, []);

  const sendPing = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString(),
      }),
    );
  }, []);

  // Auto-connect when enabled and accessToken is provided
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && accessToken) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, accessToken, connect]);

  return {
    connectionState,
    connect,
    disconnect,
    subscribe,
    sendPing,
    isConnected,
  };
}
