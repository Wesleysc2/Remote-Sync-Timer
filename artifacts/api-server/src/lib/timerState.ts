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

let state: TimerState = {
  mode: "countdown",
  status: "idle",
  initialSeconds: 0,
  currentSeconds: 0,
  overtime: false,
  soundPreset: "nenhum",
};

let tickInterval: ReturnType<typeof setInterval> | null = null;
let broadcastFn: ((state: TimerState) => void) | null = null;

export function getState(): TimerState {
  return { ...state };
}

export function setBroadcast(fn: (state: TimerState) => void) {
  broadcastFn = fn;
}

function broadcast() {
  broadcastFn?.({ ...state });
}

function startTicking() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    if (state.status !== "running") return;

    if (state.mode === "countdown") {
      if (state.currentSeconds <= 0) {
        state = { ...state, status: "finished", currentSeconds: 0, overtime: true };
        stopTicking();
      } else {
        const next = state.currentSeconds - 1;
        state = { ...state, currentSeconds: next };
      }
    } else {
      const next = state.currentSeconds + 1;
      const hitTarget = state.initialSeconds > 0 && next >= state.initialSeconds && !state.overtime;
      state = {
        ...state,
        currentSeconds: next,
        overtime: state.overtime || hitTarget,
      };
    }

    broadcast();
  }, 1000);
}

function stopTicking() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function applyCommand(cmd: TimerCommand): TimerState {
  switch (cmd.type) {
    case "SET_MODE": {
      if (state.status === "idle") {
        state = { ...state, mode: cmd.mode, currentSeconds: 0, initialSeconds: 0, overtime: false };
      } else {
        state = { ...state, mode: cmd.mode };
      }
      break;
    }

    case "START": {
      const total = cmd.minutes * 60 + cmd.seconds;
      if (state.mode === "countdown" && total === 0) break;
      state = {
        ...state,
        initialSeconds: total,
        currentSeconds: state.mode === "countdown" ? total : 0,
        status: "running",
        overtime: false,
      };
      startTicking();
      break;
    }

    case "PAUSE": {
      if (state.status === "running") {
        state = { ...state, status: "paused" };
        stopTicking();
      } else if (state.status === "paused") {
        state = { ...state, status: "running" };
        startTicking();
      }
      break;
    }

    case "RESET": {
      stopTicking();
      state = {
        ...state,
        status: "idle",
        currentSeconds: state.mode === "countdown" ? state.initialSeconds : 0,
        overtime: false,
      };
      break;
    }

    case "QUICK": {
      const total = cmd.minutes * 60;
      stopTicking();
      state = {
        ...state,
        initialSeconds: total,
        currentSeconds: state.mode === "countdown" ? total : 0,
        status: "running",
        overtime: false,
      };
      startTicking();
      break;
    }

    case "SET_SOUND": {
      state = { ...state, soundPreset: cmd.preset };
      break;
    }
  }

  broadcast();
  return { ...state };
}
