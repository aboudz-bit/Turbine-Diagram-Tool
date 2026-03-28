/**
 * useSSE — Real-time Server-Sent Events hook
 *
 * Connects to /api/events and dispatches custom events
 * that components can subscribe to for live updates.
 */
import * as React from "react";

type SSEStatus = "connecting" | "connected" | "disconnected";

interface SSEEvent {
  event: string;
  data: unknown;
}

type SSEListener = (data: unknown) => void;

const listeners = new Map<string, Set<SSEListener>>();

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getToken(): string {
  return localStorage.getItem("turbine_auth_token") ?? sessionStorage.getItem("turbine_auth_token") ?? "";
}

function connect(onStatus: (s: SSEStatus) => void) {
  if (eventSource) return;

  const token = getToken();
  if (!token) return;

  // EventSource doesn't support Authorization header, so we pass token as query param
  const url = `/api/events?token=${encodeURIComponent(token)}`;
  onStatus("connecting");

  const es = new EventSource(url);
  eventSource = es;

  es.addEventListener("connected", () => {
    onStatus("connected");
  });

  // Listen for specific event types
  const eventTypes = ["task_updated", "task_created", "qc_decision", "notification", "comment"];
  for (const type of eventTypes) {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const typeListeners = listeners.get(type);
        if (typeListeners) {
          for (const fn of typeListeners) fn(data);
        }
      } catch {
        // ignore parse errors
      }
    });
  }

  es.onerror = () => {
    es.close();
    eventSource = null;
    onStatus("disconnected");

    // Reconnect after 5 seconds
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(onStatus), 5000);
  };
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

/**
 * Hook to manage SSE connection lifecycle.
 * Call once in AppLayout or a top-level component.
 */
export function useSSE(): SSEStatus {
  const [status, setStatus] = React.useState<SSEStatus>("disconnected");

  React.useEffect(() => {
    connect(setStatus);
    return () => disconnect();
  }, []);

  return status;
}

/**
 * Hook to subscribe to a specific SSE event type.
 */
export function useSSEEvent(eventType: string, callback: SSEListener): void {
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const handler: SSEListener = (data) => callbackRef.current(data);

    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Set());
    }
    listeners.get(eventType)!.add(handler);

    return () => {
      listeners.get(eventType)?.delete(handler);
    };
  }, [eventType]);
}
