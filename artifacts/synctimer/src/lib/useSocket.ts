import { useState, useEffect, useRef, useCallback } from "react";

export interface TimerState {
  mode: "countdown" | "countup";
  status: "idle" | "running" | "paused" | "finished";
  initialSeconds: number;
  currentSeconds: number;
  overtime: boolean;
  soundPreset: string;
}

const DEFAULT: TimerState = {
  mode: "countdown",
  status: "idle",
  initialSeconds: 0,
  currentSeconds: 0,
  overtime: false,
  soundPreset: "nenhum",
};

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function useSocket() {
  const [state, setState] = useState<TimerState>(DEFAULT);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onclose = () => {
      setConnected(false);
      retryRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "STATE") setState(msg.state as TimerState);
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((cmd: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  }, []);

  return { state, connected, send };
}

export function fmt(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return totalSeconds < 0 ? `+${base}` : base;
}
