import type { LogPayload } from '../shared/log-events';
import { getContext } from './context';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogParams = {
  todoId?: string;
  title?: string;
  completed?: boolean;
  userName?: string;
  sessionId?: string;
  method?: string;
  path?: string;
  port?: number;
  status?: number;
  error?: string;
  field?: string;
  reason?: string;
};

export type ServerLogger = {
  debug: (message: string, params?: LogParams) => void;
  info: (message: string, params?: LogParams) => void;
  warn: (message: string, params?: LogParams) => void;
  error: (message: string, params?: LogParams) => void;
};

const ENDPOINT = process.env.VIRTUALLOG_ENDPOINT;
const API_KEY = process.env.VIRTUALLOG_API_KEY;

if (!ENDPOINT || !API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[vl] VIRTUALLOG_ENDPOINT / VIRTUALLOG_API_KEY not set in .env — logs will only be printed to stdout, not forwarded to VirtualLog.',
  );
}

const emit = (level: LogLevel) => (message: string, params?: LogParams) => {
  const ctx = getContext();
  const payload: LogPayload = {
    sessionId: ctx.sessionId,
    userName: ctx.userName,
    ...params,
    message,
    level,
    timestamp: new Date().toISOString(),
    app: 'sample-todo',
    module: 'server',
  };

  // Structured JSON on stdout — good for container/terminal log scraping.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));

  // Forward to VirtualLog when configured. Fire-and-forget — logging must
  // never block or break the request path.
  if (ENDPOINT && API_KEY) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* swallow — never let logging crash the request */
    });
  }
};

const log: ServerLogger = {
  debug: emit('debug'),
  info: emit('info'),
  warn: emit('warn'),
  error: emit('error'),
};

export default log;
