'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JobDetail } from '@/lib/api/owner-jobs';

type OwnerWebSocketEvent =
  | {
      type: 'new_pending_jobs';
      jobCount: number;
      timestamp: string;
      message: string;
      job?: JobDetail;
    }
  | {
      type: 'job_status_update';
      jobId: string;
      status: string;
      action: string;
      timestamp: string;
      message: string;
    }
  | {
      type: 'pong';
      timestamp: string;
    }
  | {
      type: 'subscribed';
      timestamp: string;
      message: string;
    }
  | {
      type: 'error';
      message: string;
    };

type OwnerWebSocketCallbacks = {
  onNewPendingJobs?: (
    jobCount: number,
    message: string,
    job?: JobDetail,
  ) => void;
  onJobStatusUpdate?: (jobId: string, status: string, action: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseOwnerWebSocketOptions {
  accessToken?: string;
  enabled?: boolean;
  callbacks?: OwnerWebSocketCallbacks;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface UseOwnerWebSocketReturn {
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  subscribe: () => void;
  sendPing: () => void;
  isConnected: boolean;
}

const DEFAULT_OPTIONS: Partial<UseOwnerWebSocketOptions> = {
  enabled: true,
  autoReconnect: true,
  reconnectDelay: 3000,
  maxReconnectAttempts: 5,
};

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL?.replace('http', 'ws') || 'ws://localhost:4000';

/**
 * Custom hook for connecting to the owner WebSocket gateway for real-time job updates
 *
 * @example
 * ```tsx
 * const { connectionState, isConnected } = useOwnerWebSocket({
 *   accessToken: session?.accessToken,
 *   callbacks: {
 *     onNewPendingJobs: (count) => {
 *       toast.success(`You have ${count} new jobs pending approval`);
 *       // Refresh the jobs list
 *       loadJobs();
 *     },
 *     onJobStatusUpdate: (jobId, status, action) => {
 *       console.log(`Job ${jobId} was ${action} (status: ${status})`);
 *     },
 *   },
 * });
 * ```
 */
export function useOwnerWebSocket(
  options: UseOwnerWebSocketOptions = {},
): UseOwnerWebSocketReturn {
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
  const callbacksRef = useRef<OwnerWebSocketCallbacks>(callbacks);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

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
        const data: OwnerWebSocketEvent = JSON.parse(event.data);
        const { type } = data;

        switch (type) {
          case 'new_pending_jobs':
            if (callbacksRef.current.onNewPendingJobs) {
              callbacksRef.current.onNewPendingJobs(
                data.jobCount,
                data.message,
                data.job,
              );
            }
            break;

          case 'job_status_update':
            if (callbacksRef.current.onJobStatusUpdate) {
              callbacksRef.current.onJobStatusUpdate(
                data.jobId,
                data.status,
                data.action,
              );
            }
            break;

          case 'pong':
            // Heartbeat acknowledged, do nothing
            break;

          case 'subscribed':
            console.log('Successfully subscribed to owner WebSocket updates');
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

    console.log('Owner WebSocket connected');
    setConnectionState('connected');
    reconnectAttemptsRef.current = 0;

    // Send subscribe message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
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

      console.log('Owner WebSocket disconnected:', event.code, event.reason);
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
    [
      autoReconnect,
      enabled,
      maxReconnectAttempts,
      reconnectDelay,
      cleanup,
    ],
  );

  const handleError = useCallback(
    (event: Event) => {
      if (!isMountedRef.current) return;

      console.error('Owner WebSocket error:', event);
      setConnectionState('error');

      if (callbacksRef.current.onError) {
        callbacksRef.current.onError('WebSocket connection error');
      }
    },
    [],
  );

  const connect = useCallback(() => {
    if (!accessToken || !enabled) {
      console.warn('Cannot connect to WebSocket: missing access token or disabled');
      return;
    }

    if (wsRef.current) {
      console.warn('WebSocket already exists, cleaning up before reconnecting');
      cleanup();
    }

    try {
      setConnectionState('connecting');

      // Build WebSocket URL with token
      const wsUrl = new URL(`${WS_URL}/ws/owner`);
      wsUrl.searchParams.set('token', accessToken);

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = handleOpen;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      ws.onmessage = handleMessage;

      console.log('Connecting to owner WebSocket...');
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionState('error');
      handleError(new Event('error'));
    }
  }, [accessToken, enabled, cleanup, handleOpen, handleClose, handleError, handleMessage]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting owner WebSocket...');
    cleanup();
    setConnectionState('disconnected');
  }, [cleanup]);

  const subscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      console.warn('Cannot subscribe: WebSocket not connected');
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        }),
      );
    } else {
      console.warn('Cannot send ping: WebSocket not connected');
    }
  }, []);

  // Setup connection on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [enabled, accessToken, connect, disconnect]);

  // Setup heartbeat interval for keep-alive
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      sendPing();
    }, 30000); // Send ping every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected, sendPing]);

  return {
    connectionState,
    connect,
    disconnect,
    subscribe,
    sendPing,
    isConnected,
  };
}

/**
 * Helper hook for using WebSocket with NextAuth session
 */
export function useOwnerWebSocketWithSession(session: any, callbacks?: OwnerWebSocketCallbacks) {
  return useOwnerWebSocket({
    accessToken: session?.accessToken,
    callbacks,
    enabled: !!session?.accessToken && session?.user?.role === 'OWNER',
  });
}
