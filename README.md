# virtuallog-sample-todo

A minimal Todo application that demonstrates **how to send structured logs to [VirtualLog](https://virtuallog.io) and monitor a running application end-to-end** — from browser interactions to server-side request handling.

It is intentionally tiny: one feature (todos), one log-event union, two logger implementations (browser + Node). The point is to show the wiring, not the product.

- **Server**: Node.js + Express. Every request and business event emits a typed log.
- **Browser**: React + Vite. Every user action emits a typed log.
- **Shared types**: a single discriminated union in `shared/log-events.ts` keeps log shapes consistent across the wire.

Live demo: [sample-todo.virtuallog.io](https://sample-todo.virtuallog.io)

## What you'll see in VirtualLog

Open the app, click around — every action emits a log tagged with your `userName` and `sessionId`. In your VirtualLog dashboard you can:

- Filter by `sessionId` to see one user's full session in isolation
- Filter by `message` (e.g. `Todo created`, `API error`) to spot patterns
- Chart errors over time, count requests, alert on failures
- Drill from a client click into the matching server request (same `sessionId`)

## Run it locally

Requires Node 20+.

### 1. Clone

```bash
git clone https://github.com/virtualskyhq/virtuallog-sample-todo.git
cd virtuallog-sample-todo
npm install
```

### 2. Configure the VirtualLog connection (`.env`)

*Where* logs go and the *key* to send them live in a `.env` at the repo root — two variables, one entry per concept. The **server** reads them via `--env-file=.env`; the **browser logger** reads the same two through Vite (`client/vite.config.ts` widens `envPrefix` to `VIRTUALLOG_*`). They're read in exactly one client file — `client/logger.ts`. Identity (`userName` / `sessionId`) is **not** here — that's entered on the login screen at runtime (step 4).

```bash
VIRTUALLOG_ENDPOINT=https://<your_server>/logs
VIRTUALLOG_API_KEY=<your_api_key>
```

`.env` is gitignored. Omit it (or leave the values blank) to keep every log in the console only — the app still works, the browser just prints a one-time warning instead of forwarding.

> **Security note**: because the browser logger reads them, these two values are baked into the JS bundle at build time. For this demo that's intentional — the ingest key is meant to be public (ingestion-only, rate-limited). For a real app with a secret key, keep `envPrefix` at Vite's default and proxy log POSTs through your own backend instead.

### 3. Build and run

**Dev mode** — server (3000) + client (5173) with hot reload and API proxy:

```bash
npm run dev
```

**Production-style single-server run**:

```bash
npm run build
npm start       # http://localhost:3000 serves both the React build and the API
```

### 4. Identify yourself

Open the app — a login screen blocks the UI until you set who you are. Two fields:

| Field                  | Notes                                                                                      |
|------------------------|--------------------------------------------------------------------------------------------|
| **User Name**          | Any label that identifies who is using the app.                                            |
| **Browser Session ID** | Paste your `browserSessionId` from VirtualLog to correlate, or click **Generate** for a random 16-char ID. Groups all logs from this browser into one session. |

Both values are saved to `localStorage` and read by the logger on every emit — `userName` + `sessionId` go in the JSON body. The `x-api-key` header and target URL come from the `.env` config (step 2), not the form. Click **Enter app** to start.

### 5. Open VirtualLog and navigate the logs

In your VirtualLog dashboard:

1. Filter by the `sessionId` you generated to see only your session.
2. Add the `userName` field to a column for quick scanning.
3. Use the playground buttons in the app (**Trigger server error**, **Trigger client error**) to populate the dashboard quickly.
4. Click any log to see the full payload, including the discriminated `event` variant.

## How the logging works

`shared/log-events.ts` defines a single flat `LogPayload`. `message` is a free-form label you pass straight from the call site — nothing to pre-register — and you attach any extra context as additional fields:

```ts
export type LogPayload = {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  app: string;
  module: 'server' | 'client';
  message: string;
  sessionId?: string;
  userName?: string;
  [key: string]: unknown;
};
```

Both `server/logger.ts` and `client/logger.ts` accept `{ message, ...context }` and fill in the wrapper fields — and, in the browser, identity from `localStorage` — at send time:

```ts
logger.info({ message: 'Todo created', todoId, title });
logger.warn({ message: 'Validation failed', field: 'title', reason: 'empty' });
logger.error({ message: 'API error', method, path, status, error });
```

In the browser console each line prints as `LEVEL  time  message  {…remaining fields}`; over the wire the full `LogPayload` is POSTed to VirtualLog with the `x-api-key` header.

## Project layout

```
shared/log-events.ts       Discriminated union: every log event the app emits
server/server.ts           Express app, static + API
server/routes.ts           Todo CRUD + /api/todos/_demo/error
server/db.ts               In-memory store
server/logger.ts           Server-side logger (POSTs to VirtualLog endpoint)
client/main.tsx            React entry
client/App.tsx             LoginGate (identity) + Todo UI + Playground
client/api.ts              Fetch wrapper, propagates sessionId + userName
client/session.ts          Identity in localStorage (userName + sessionId)
client/logger.ts           Browser logger: config (domain + key) from env at
                           init, identity from session.ts at emit, x-api-key header
```

## Playground

Two buttons in the UI to populate VirtualLog quickly:

- **Trigger server error** — calls `POST /api/todos/_demo/error` which returns 500 and logs `Simulated server error`.
- **Trigger client error** — emits a client-side `Simulated client error` log.
