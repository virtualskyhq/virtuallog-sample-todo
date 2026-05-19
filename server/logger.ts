import type { ServerLogEvent, LogPayload } from '../shared/log-events';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LoggerConfig = {
  endpoint?: string;
  apiKey?: string;
  appName: string;
};

type LogContext = {
  sessionId?: string;
};

// The generic `<E extends ServerLogEvent>` is the key — it forces the caller
// to pass an object that matches one of the variants of the discriminated
// union exactly. Try passing the wrong fields for an `event` value: TS errors.
export type ServerLogger = {
  debug: <E extends ServerLogEvent>(event: E, context?: LogContext) => void;
  info: <E extends ServerLogEvent>(event: E, context?: LogContext) => void;
  warn: <E extends ServerLogEvent>(event: E, context?: LogContext) => void;
  error: <E extends ServerLogEvent>(event: E, context?: LogContext) => void;
};

export const createLogger = (config: LoggerConfig): ServerLogger => {
  const emit = (level: LogLevel) =>
    <E extends ServerLogEvent>(event: E, context: LogContext = {}) => {
      const payload: LogPayload<E> = {
        ...event,
        level,
        timestamp: new Date().toISOString(),
        app: config.appName,
        module: 'server',
        sessionId: context.sessionId,
      };

      // Always echo to stdout — useful during local dev and for container logs.
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(payload));

      // Forward to VirtualLog when configured. Fire-and-forget — logging must
      // never block or break the application path.
      if (config.endpoint && config.apiKey) {
        fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.apiKey,
          },
          body: JSON.stringify(payload),
        }).catch(() => {
          /* swallow — never let logging crash the request */
        });
      }
    };

  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
  };
};
