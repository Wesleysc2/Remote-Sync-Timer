# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + WebSocket backend
│   └── synctimer/          # React frontend (SyncTimer app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## SyncTimer App

A real-time synchronized timer app at `artifacts/synctimer` (frontend) + WebSocket backend in `artifacts/api-server`.

- **Display screen** (`/`) — fullscreen timer view, connects via WebSocket
- **Admin/control panel** (`/admin`) — sends commands via WebSocket
- **WebSocket server** — lives at `/ws` on the API server; maintains timer state server-side and broadcasts to all clients
- Timer state and ticking happen entirely server-side (`artifacts/api-server/src/lib/timerState.ts`)
- WebSocket handler: `artifacts/api-server/src/lib/wsServer.ts`
- Frontend hook: `artifacts/synctimer/src/lib/useTimerSync.ts`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /healthz` (full path: `/api/healthz`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.mjs`)

### `artifacts/synctimer` (`@workspace/synctimer`)

React + Vite frontend for the SyncTimer app.

- Entry: `src/main.tsx` — mounts React app
- Routing: `src/App.tsx` — `/` display page, `/admin` admin panel
- UI components used: `card`, `toast`, `toaster`, `tooltip` (from `src/components/ui/`)
- Hooks: `src/hooks/use-toast.ts`
- Timer logic: `src/lib/useTimerSync.ts`, `src/lib/useTimerSounds.ts`
- `PORT=19211 BASE_PATH=/ pnpm --filter @workspace/synctimer run dev` — run the dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models (currently empty)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## Deployment (Namecheap VPS or any Node.js host)

The project requires a Node.js server (for WebSocket support). Shared static hosting is not sufficient.

### Steps

```bash
# 1. Clone the repo and install dependencies
pnpm install

# 2. Build everything and start the server (default port 3000)
pnpm start

# Or with a custom port:
PORT=8080 pnpm start
```

The `pnpm start` script does three things in order:
1. Builds the frontend → outputs to `dist/` at the project root
2. Builds the backend → outputs to `artifacts/api-server/dist/index.mjs`
3. Starts the Express server → serves the frontend files + WebSocket at the same port

### Entry points

- `index.html` — project root source entry (processed by Vite during build)
- `dist/index.html` — compiled app entry served by the Express server in production
- `artifacts/synctimer/src/main.tsx` — React app root
- `artifacts/api-server/src/index.ts` — Express server root
