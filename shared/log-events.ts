// Single source of truth for every log event in the app.
//
// Why a discriminated union and not free-form objects?
//   - Adding a new event is a one-line change that TypeScript enforces at every
//     call site — no hidden contract drift between client and server.
//   - The dashboard side can rely on a finite, known set of event names and
//     fields, which makes search, alerts and visualizations far simpler.
//
// Pattern: each event has a literal `event` discriminator plus its own fields.
// At a call site `logger.info({ event: 'todo_created', todoId, title })`,
// TypeScript narrows to the matching variant and rejects missing/extra fields.

export type ServerLogEvent =
  | { event: 'server_started'; port: number }
  | { event: 'request_received'; method: string; path: string }
  | { event: 'todo_created'; todoId: string; title: string }
  | { event: 'todo_toggled'; todoId: string; completed: boolean }
  | { event: 'todo_deleted'; todoId: string }
  | { event: 'validation_failed'; field: string; reason: string }
  | { event: 'simulated_server_error'; message: string };

export type ClientLogEvent =
  | { event: 'app_loaded'; userAgent: string }
  | { event: 'setup_completed'; userName: string; sessionId: string }
  | { event: 'setup_reset' }
  | { event: 'session_id_set'; sessionId: string }
  | { event: 'session_id_generated'; sessionId: string }
  | { event: 'session_id_cleared' }
  | { event: 'add_todo_clicked'; title: string }
  | { event: 'toggle_clicked'; todoId: string }
  | { event: 'delete_clicked'; todoId: string }
  | { event: 'empty_title_rejected' }
  | { event: 'api_error'; method: string; path: string; status?: number; message: string }
  | { event: 'simulated_client_error'; message: string };

// Union of everything the VirtualLog ingest receives from this app.
export type LogEvent = ServerLogEvent | ClientLogEvent;

// The shape posted on the wire. The logger adds these wrapper fields around
// whichever event variant is being emitted.
export type LogPayload<E extends LogEvent = LogEvent> = E & {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  app: string;
  module: 'server' | 'client';
  sessionId?: string;
  userName?: string;
};
