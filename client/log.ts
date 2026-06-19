import type { LogPayload } from '../shared/log-events';
import { getUserName, getSessionId } from './session';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogParams = {
  todoId?: string;
  title?: string;
  completed?: boolean;
  userAgent?: string;
  userName?: string;
  sessionId?: string;
  method?: string;
  path?: string;
  status?: number;
  error?: string;
  field?: string;
  reason?: string;
};

export type BrowserLogger = {
  debug: (message: string, params?: LogParams) => void;
  info: (message: string, params?: LogParams) => void;
  warn: (message: string, params?: LogParams) => void;
  error: (message: string, params?: LogParams) => void;
};

// Connection config is fixed per deployment and read once, here only, from the
// build-time env (Vite exposes VIRTUALLOG_* — see vite.config.ts envPrefix).
const DOMAIN = import.meta.env.VIRTUALLOG_ENDPOINT as string | undefined;
const API_KEY = import.meta.env.VIRTUALLOG_API_KEY as string | undefined;

// Exposed so the UI can show where logs are going.
export const virtualLogDomain = DOMAIN ?? '';

if (!DOMAIN || !API_KEY) {
  // One-time heads-up. The app still works; logs just stay in the console.
  // eslint-disable-next-line no-console
  console.warn(
    '[vl] VIRTUALLOG_ENDPOINT / VIRTUALLOG_API_KEY not set in .env — logs will only be printed to the console, not forwarded to VirtualLog.',
  );
}

// HH:mm:ss.zzz in the browser's local timezone, for the console line only.
// The wire payload keeps the full ISO timestamp.
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

// Shown as their own columns, or transport noise — kept out of the trailing
// JSON of the console line.
const CONSOLE_EXCLUDED = new Set([
  'level',
  'timestamp',
  'message',
  'sessionId',
  'userAgent',
  'app',
  'module',
]);

const emit = (level: LogLevel) => (message: string, params?: LogParams) => {
  const payload: LogPayload = {
    ...params,
    message,
    level,
    timestamp: new Date().toISOString(),
    app: 'sample-todo',
    module: 'client',
  };

  // Identity is read fresh at send time; omit whatever isn't set.
  const userName = getUserName();
  const sessionId = getSessionId();
  if (userName) payload.userName = userName;
  if (sessionId) payload.sessionId = sessionId;

  const rest = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !CONSOLE_EXCLUDED.has(key)),
  );
  // LEVEL  time  message  {remaining attributes}
  // eslint-disable-next-line no-console
  console.log(
    payload.level.toUpperCase(),
    formatTime(payload.timestamp),
    payload.message,
    Object.keys(rest).length ? JSON.stringify(rest) : '',
  );

  if (!DOMAIN || !API_KEY) return;

  // fetch + keepalive: survives page unload like sendBeacon but supports the
  // custom x-api-key header (sendBeacon cannot send headers).
  fetch(DOMAIN, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    /* logging must never break the app */
  });
};

const log: BrowserLogger = {
  debug: emit('debug'),
  info: emit('info'),
  warn: emit('warn'),
  error: emit('error'),
};

export default log;
