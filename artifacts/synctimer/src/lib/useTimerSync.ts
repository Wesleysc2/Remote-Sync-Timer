import { useState, useEffect, useRef, useCallback } from "react";

export type TimerMode = "countdown" | "countup";
export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  initialSeconds: number;
  currentSeconds: number;
  overtime: boolean;
  soundPreset: string;
}

export type TimerCommand =
  | { type: "SET_MODE"; mode: TimerMode }
  | { type: "START"; minutes: number; seconds: number }
  | { type: "PAUSE" }
  | { type: "RESET" }
  | { type: "QUICK"; minutes: number }
  | { type: "SET_SOUND"; preset: string };

const DEFAULT_STATE: TimerState = {
  mode: "countdown",
  status: "idle",
  initialSeconds: 0,
  currentSeconds: 0,
  overtime: false,
  soundPreset: "nenhum",
};

function getWsUrl(): string {
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${loc.host}/ws`;
}

export function useTimerSync() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "STATE") {
          setState(msg.payload as TimerState);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendCommand = useCallback((cmd: TimerCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  const setMode = useCallback((mode: TimerMode) => sendCommand({ type: "SET_MODE", mode }), [sendCommand]);
  const start = useCallback((minutes: number, seconds: number) => sendCommand({ type: "START", minutes, seconds }), [sendCommand]);
  const pause = useCallback(() => sendCommand({ type: "PAUSE" }), [sendCommand]);
  const reset = useCallback(() => sendCommand({ type: "RESET" }), [sendCommand]);
  const setQuick = useCallback((minutes: number) => sendCommand({ type: "QUICK", minutes }), [sendCommand]);
  const setSound = useCallback((preset: string) => sendCommand({ type: "SET_SOUND", preset }), [sendCommand]);

  return { ...state, connected, setMode, start, pause, reset, setQuick, setSound };
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
