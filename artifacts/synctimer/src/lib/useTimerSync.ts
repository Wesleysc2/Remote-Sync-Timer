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

export function useTimerSync() {
  const [state, setState] = useState<TimerState>(DEFAULT_STATE);
  const stateRef = useRef<TimerState>(DEFAULT_STATE);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback((updater: (s: TimerState) => TimerState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const stopTicking = useCallback(() => {
    if (tickInterval.current) {
      clearInterval(tickInterval.current);
      tickInterval.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    stopTicking();
    tickInterval.current = setInterval(() => {
      setState((prev) => {
        if (prev.status !== "running") return prev;

        let next: TimerState;
        if (prev.mode === "countdown") {
          if (prev.currentSeconds <= 0) {
            clearInterval(tickInterval.current!);
            tickInterval.current = null;
            next = { ...prev, status: "finished", currentSeconds: 0, overtime: true };
          } else {
            next = { ...prev, currentSeconds: prev.currentSeconds - 1 };
          }
        } else {
          const nextSecs = prev.currentSeconds + 1;
          const hitTarget =
            prev.initialSeconds > 0 &&
            nextSecs >= prev.initialSeconds &&
            !prev.overtime;
          next = {
            ...prev,
            currentSeconds: nextSecs,
            overtime: prev.overtime || hitTarget,
          };
        }
        stateRef.current = next;
        return next;
      });
    }, 1000);
  }, [stopTicking]);

  useEffect(() => {
    return () => stopTicking();
  }, [stopTicking]);

  const applyCommand = useCallback(
    (cmd: TimerCommand) => {
      switch (cmd.type) {
        case "SET_MODE": {
          updateState((s) => {
            if (s.status === "idle") {
              return { ...s, mode: cmd.mode, currentSeconds: 0, initialSeconds: 0, overtime: false };
            }
            return { ...s, mode: cmd.mode };
          });
          break;
        }
        case "START": {
          const total = cmd.minutes * 60 + cmd.seconds;
          updateState((s) => {
            if (s.mode === "countdown" && total === 0) return s;
            return {
              ...s,
              initialSeconds: total,
              currentSeconds: s.mode === "countdown" ? total : 0,
              status: "running",
              overtime: false,
            };
          });
          startTicking();
          break;
        }
        case "PAUSE": {
          updateState((s) => {
            if (s.status === "running") {
              stopTicking();
              return { ...s, status: "paused" };
            } else if (s.status === "paused") {
              startTicking();
              return { ...s, status: "running" };
            }
            return s;
          });
          break;
        }
        case "RESET": {
          stopTicking();
          updateState((s) => ({
            ...s,
            status: "idle",
            currentSeconds: s.mode === "countdown" ? s.initialSeconds : 0,
            overtime: false,
          }));
          break;
        }
        case "QUICK": {
          const total = cmd.minutes * 60;
          stopTicking();
          updateState((s) => ({
            ...s,
            initialSeconds: total,
            currentSeconds: s.mode === "countdown" ? total : 0,
            status: "running",
            overtime: false,
          }));
          startTicking();
          break;
        }
        case "SET_SOUND": {
          updateState((s) => ({ ...s, soundPreset: cmd.preset }));
          break;
        }
      }
    },
    [updateState, startTicking, stopTicking]
  );

  const setMode = useCallback((mode: TimerMode) => applyCommand({ type: "SET_MODE", mode }), [applyCommand]);
  const start = useCallback((minutes: number, seconds: number) => applyCommand({ type: "START", minutes, seconds }), [applyCommand]);
  const pause = useCallback(() => applyCommand({ type: "PAUSE" }), [applyCommand]);
  const reset = useCallback(() => applyCommand({ type: "RESET" }), [applyCommand]);
  const setQuick = useCallback((minutes: number) => applyCommand({ type: "QUICK", minutes }), [applyCommand]);
  const setSound = useCallback((preset: string) => applyCommand({ type: "SET_SOUND", preset }), [applyCommand]);

  return { ...state, connected: true, setMode, start, pause, reset, setQuick, setSound };
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
