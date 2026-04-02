import { create } from "zustand";

export type TimerMode = "countdown" | "countup";
export type TimerStatus = "idle" | "running" | "paused" | "finished";

interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  initialSeconds: number;
  currentSeconds: number;
  setMode: (mode: TimerMode) => void;
  setTime: (minutes: number, seconds: number) => void;
  start: (minutes: number, seconds: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  setQuick: (minutes: number) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "countdown",
  status: "idle",
  initialSeconds: 0,
  currentSeconds: 0,

  setMode: (mode) => {
    const { status } = get();
    if (status === "idle") {
      set({ mode, currentSeconds: 0, initialSeconds: 0 });
    } else {
      set({ mode });
    }
  },

  setTime: (minutes, seconds) => {
    const total = minutes * 60 + seconds;
    set({ initialSeconds: total, currentSeconds: total });
  },

  start: (minutes, seconds) => {
    const total = minutes * 60 + seconds;
    const { mode } = get();
    if (mode === "countdown" && total === 0) return;
    set({
      initialSeconds: total,
      currentSeconds: mode === "countdown" ? total : 0,
      status: "running",
    });
  },

  pause: () => {
    const { status } = get();
    if (status === "running") set({ status: "paused" });
    else if (status === "paused") set({ status: "running" });
  },

  resume: () => {
    set({ status: "running" });
  },

  reset: () => {
    const { mode, initialSeconds } = get();
    set({
      status: "idle",
      currentSeconds: mode === "countdown" ? initialSeconds : 0,
    });
  },

  tick: () => {
    const { mode, status, currentSeconds } = get();
    if (status !== "running") return;

    if (mode === "countdown") {
      if (currentSeconds <= 0) {
        set({ status: "finished", currentSeconds: 0 });
      } else {
        set({ currentSeconds: currentSeconds - 1 });
      }
    } else {
      set({ currentSeconds: currentSeconds + 1 });
    }
  },

  setQuick: (minutes) => {
    const { mode } = get();
    const total = minutes * 60;
    set({
      initialSeconds: total,
      currentSeconds: mode === "countdown" ? total : 0,
      status: "running",
    });
  },
}));

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
