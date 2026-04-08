import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Resolve path to project-root/dist from the built file location
// Built file: artifacts/api-server/dist/index.mjs → up 3 levels → project root → dist/
const distPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "dist");

if (existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
      return next();
    }
    res.sendFile(resolve(distPath, "index.html"));
  });
}

export default app;
