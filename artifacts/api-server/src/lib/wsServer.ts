import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { getState, applyCommand, setBroadcast, TimerCommand } from "./timerState.js";
import { logger } from "./logger.js";

const clients = new Set<WebSocket>();

function broadcastState() {
  const state = getState();
  const msg = JSON.stringify({ type: "STATE", payload: state });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

export function attachWsServer(server: Server) {
  setBroadcast(broadcastState);

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    clients.add(ws);
    logger.info({ clients: clients.size }, "WebSocket client connected");

    ws.send(JSON.stringify({ type: "STATE", payload: getState() }));

    ws.on("message", (raw) => {
      try {
        const cmd = JSON.parse(raw.toString()) as TimerCommand;
        applyCommand(cmd);
      } catch (e) {
        logger.warn({ err: e }, "Invalid WebSocket message");
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      logger.info({ clients: clients.size }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.warn({ err }, "WebSocket error");
      clients.delete(ws);
    });
  });

  return wss;
}
