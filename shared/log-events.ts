// One flat shape for every log line, server and browser.
//
// `message` is a free-form label you pass straight from the call site — no
// need to pre-register it anywhere. Attach any extra context as additional
// fields; the index signature lets them through. The logger fills the wrapper
// fields (level, timestamp, app, module) and, on the browser, identity
// (sessionId, userName) at send time.
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
