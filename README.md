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
- Filter by `event` (e.g. `todo_created`, `api_error`) to spot patterns
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

### 2. (Optional) point the server logger at your VirtualLog instance

The browser is configured at runtime (see step 4). The server reads from `.env`:

```bash
cp .env.example .env
# edit .env and set:
#   VIRTUALLOG_ENDPOINT=https://<your_server>/logs
#   VIRTUALLOG_API_KEY=<your_api_key>
```

Leave the values empty to keep server logs on stdout only — useful for local exploration.

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

### 4. Configure the browser

Open the app — a setup screen blocks the UI until you fill four mandatory fields:

| Field                  | Notes                                                                                      |
|------------------------|--------------------------------------------------------------------------------------------|
| **User Name**          | Any label that identifies who is using the app.                                            |
| **Browser Session ID** | Click **Generate** for a random 16-char ID. Used to group all logs from this browser into one session in VirtualLog. |
| **VirtualLog domain**  | Full URL of your VirtualLog ingest endpoint, e.g. `https://<your_server>/logs`.            |
| **API Key**            | A VirtualLog API key with ingestion role.                                                  |

The four values are stored in `localStorage` and sent on every log:

- `x-api-key` header carries the API key
- `sessionId` and `userName` are included in the JSON body

Click **Enter app** to start using the todo.

### 5. Open VirtualLog and navigate the logs

In your VirtualLog dashboard:

1. Filter by the `sessionId` you generated to see only your session.
2. Add the `userName` field to a column for quick scanning.
3. Use the playground buttons in the app (**Trigger server error**, **Trigger client error**) to populate the dashboard quickly.
4. Click any log to see the full payload, including the discriminated `event` variant.

## How the logging works

`shared/log-events.ts` defines every event the app can emit, as a discriminated union:

```ts
export type ServerLogEvent =
  | { event: 'todo_created'; todoId: string; title: string }
  | { event: 'validation_failed'; field: string; reason: string }
  | ...;
```

Both `server/logger.ts` and `client/logger.ts` take that union as a generic constraint:

```ts
info: <E extends ServerLogEvent>(event: E, context?: LogContext) => void;
```

Result: at the call site, TypeScript narrows the event variant by the literal `event` value and enforces the rest of the fields exactly.

```ts
log.info({ event: 'todo_created', todoId, title });        // OK
log.info({ event: 'todo_created', todoId });               // missing title
log.info({ event: 'todo_created', todoId, title, extra }); // excess property
```

Add a new event? Add a variant in `shared/log-events.ts` and every call site is type-checked.

## Project layout

```
shared/log-events.ts       Discriminated union: every log event the app emits
server/server.ts           Express app, static + API
server/routes.ts           Todo CRUD + /api/todos/_demo/error
server/db.ts               In-memory store
server/logger.ts           Server-side logger (POSTs to VirtualLog endpoint)
client/main.tsx            React entry
client/App.tsx             SetupGate + Todo UI + Playground
client/api.ts              Fetch wrapper, propagates sessionId + userName
client/logger.ts           Browser logger (runtime config in localStorage,
                           POSTs with x-api-key header)
```

## Playground

Two buttons in the UI to populate VirtualLog quickly:

- **Trigger server error** — calls `POST /api/todos/_demo/error` which returns 500 and logs `simulated_server_error`.
- **Trigger client error** — emits a client-side `simulated_client_error` log.
