import type { ClientLogEvent, LogPayload } from '../shared/log-events';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const STORAGE_KEYS = {
  sessionId: 'vl-session-id',
  userName: 'vl-user-name',
  domain: 'vl-domain',
  apiKey: 'vl-api-key',
} as const;

export type LoggerSetup = {
  userName: string;
  sessionId: string;
  domain: string;
  apiKey: string;
};

type LoggerConfig = {
  appName: string;
};

// Same generic pattern as the server logger — see shared/log-events.ts for the
// motivation. The discriminated union flows through the generic, so misnaming
// a field at a call site is a TypeScript error rather than runtime garbage.
export type BrowserLogger = {
  debug: <E extends ClientLogEvent>(event: E) => void;
  info: <E extends ClientLogEvent>(event: E) => void;
  warn: <E extends ClientLogEvent>(event: E) => void;
  error: <E extends ClientLogEvent>(event: E) => void;
  getSetup: () => Partial<LoggerSetup>;
  saveSetup: (setup: LoggerSetup) => void;
  clearSetup: () => void;
  isConfigured: () => boolean;
  getSessionId: () => string | null;
  getUserName: () => string | null;
  getDomain: () => string | null;
};

const readKey = (key: string): string | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
};

export const generateSessionId = (length = 32): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

export const createLogger = (config: LoggerConfig): BrowserLogger => {
  const emit = (level: LogLevel) =>
    <E extends ClientLogEvent>(event: E) => {
      const sessionId = readKey(STORAGE_KEYS.sessionId) ?? undefined;
      const userName = readKey(STORAGE_KEYS.userName) ?? undefined;
      const domain = readKey(STORAGE_KEYS.domain);
      const apiKey = readKey(STORAGE_KEYS.apiKey);

      const payload: LogPayload<E> = {
        ...event,
        level,
        timestamp: new Date().toISOString(),
        app: config.appName,
        module: 'client',
        sessionId,
        userName,
      };

      // eslint-disable-next-line no-console
      console.log('[vl]', payload);

      if (!domain || !apiKey) return;

      // fetch + keepalive: survives unload like sendBeacon but supports custom
      // headers (sendBeacon cannot send x-api-key).
      fetch(domain, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        /* logging must never break the app */
      });
    };

  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    getSetup: () => ({
      userName: readKey(STORAGE_KEYS.userName) ?? undefined,
      sessionId: readKey(STORAGE_KEYS.sessionId) ?? undefined,
      domain: readKey(STORAGE_KEYS.domain) ?? undefined,
      apiKey: readKey(STORAGE_KEYS.apiKey) ?? undefined,
    }),
    saveSetup: (setup) => {
      localStorage.setItem(STORAGE_KEYS.userName, setup.userName);
      localStorage.setItem(STORAGE_KEYS.sessionId, setup.sessionId);
      localStorage.setItem(STORAGE_KEYS.domain, setup.domain);
      localStorage.setItem(STORAGE_KEYS.apiKey, setup.apiKey);
    },
    clearSetup: () => {
      localStorage.removeItem(STORAGE_KEYS.userName);
      localStorage.removeItem(STORAGE_KEYS.sessionId);
      localStorage.removeItem(STORAGE_KEYS.domain);
      localStorage.removeItem(STORAGE_KEYS.apiKey);
    },
    isConfigured: () =>
      !!readKey(STORAGE_KEYS.userName) &&
      !!readKey(STORAGE_KEYS.sessionId) &&
      !!readKey(STORAGE_KEYS.domain) &&
      !!readKey(STORAGE_KEYS.apiKey),
    getSessionId: () => readKey(STORAGE_KEYS.sessionId),
    getUserName: () => readKey(STORAGE_KEYS.userName),
    getDomain: () => readKey(STORAGE_KEYS.domain),
  };
};
