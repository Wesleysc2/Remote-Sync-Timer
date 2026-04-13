import { createServer } from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";

// ─── Timer State ─────────────────────────────────────────────────────────────

interface State {
  mode: "countdown" | "countup";
  status: "idle" | "running" | "paused" | "finished";
  initialSeconds: number;
  currentSeconds: number;
  overtime: boolean;
  soundPreset: string;
}

let state: State = {
  mode: "countdown",
  status: "idle",
  initialSeconds: 0,
  currentSeconds: 0,
  overtime: false,
  soundPreset: "nenhum",
};

let tick: ReturnType<typeof setInterval> | null = null;

function startTick() {
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    if (state.status !== "running") return;

    if (state.mode === "countdown") {
      if (state.currentSeconds > 0) {
        state.currentSeconds--;
        if (state.currentSeconds === 0) {
          state.status = "finished";
        }
      } else {
        state.overtime = true;
        state.currentSeconds--;
      }
    } else {
      state.currentSeconds++;
    }

    broadcast();
  }, 1000);
}

function stopTick() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

// ─── HTTP + WebSocket ─────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const clients = new Set<WebSocket>();

function broadcast() {
  const msg = JSON.stringify({ type: "STATE", state });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: "STATE", state }));

  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
  ws.on("message", (raw) => {
    try {
      handleCmd(JSON.parse(raw.toString()));
    } catch {
      /* ignore malformed messages */
    }
  });
});

function handleCmd(cmd: Record<string, unknown>) {
  switch (cmd.type) {
    case "SET_AND_START": {
      const seconds = (cmd.seconds as number) ?? 0;
      if (cmd.mode) state.mode = cmd.mode as State["mode"];
      state.initialSeconds = seconds;
      state.currentSeconds = seconds;
      state.status = "running";
      state.overtime = false;
      startTick();
      break;
    }
    case "PAUSE": {
      if (state.status === "running") {
        state.status = "paused";
        stopTick();
      } else if (state.status === "paused" || state.status === "finished") {
        state.status = "running";
        startTick();
      }
      break;
    }
    case "RESET": {
      stopTick();
      state.status = "idle";
      state.currentSeconds = 0;
      state.initialSeconds = 0;
      state.overtime = false;
      break;
    }
    case "SET_MODE": {
      state.mode = cmd.mode as State["mode"];
      break;
    }
    case "SET_SOUND": {
      state.soundPreset = cmd.preset as string;
      break;
    }
  }
  broadcast();
}

// ─── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env["PORT"] ?? 3000);
httpServer.listen(port, () => {
  console.log(`SyncTimer server listening on port ${port}`);
});
