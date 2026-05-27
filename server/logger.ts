import type { LogPayload } from '../shared/log-events';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// What a caller passes: a message plus any context. The logger adds the
// wrapper fields and the per-request sessionId.
type LogInput = { message: string; [key: string]: unknown };

type LoggerConfig = {
  endpoint?: string;
  apiKey?: string;
  appName: string;
};

type LogContext = {
  sessionId?: string;
};

export type ServerLogger = {
  debug: (input: LogInput, context?: LogContext) => void;
  info: (input: LogInput, context?: LogContext) => void;
  warn: (input: LogInput, context?: LogContext) => void;
  error: (input: LogInput, context?: LogContext) => void;
};

export const createLogger = (config: LoggerConfig): ServerLogger => {
  const emit =
    (level: LogLevel) =>
    (input: LogInput, context: LogContext = {}) => {
      const payload: LogPayload = {
        ...input,
        level,
        timestamp: new Date().toISOString(),
        app: config.appName,
        module: 'server',
        sessionId: context.sessionId,
      };

      // Structured JSON on stdout — good for container/terminal log scraping.
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(payload));

      // Forward to VirtualLog when configured. Fire-and-forget — logging must
      // never block or break the request path.
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
