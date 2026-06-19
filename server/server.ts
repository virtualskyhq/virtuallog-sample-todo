import express from 'express';
import path from 'path';
import { createDb } from './db';
import { createLogger } from './logger';
import { createTodoRoutes } from './routes';

const port = Number(process.env.PORT) || 3000;
// Resolved from cwd so the same path works whether tsx is running the source
// (cwd = repo root, __dirname = server/) or node is running the build
// (cwd = repo root, __dirname = dist/server/). All npm scripts launch from
// the repo root, so cwd is the stable reference.
const publicDir = path.resolve(process.cwd(), 'public');

const log = createLogger({
  appName: 'sample-todo',
  endpoint: process.env.VIRTUALLOG_ENDPOINT,
  apiKey: process.env.VIRTUALLOG_API_KEY,
});

const db = createDb();
const app = express();

app.use(express.json());

// Request log middleware. Reads the optional X-VL-Session header so server
// logs carry the same sessionId the browser is tagging its own logs with.
app.use((req, _res, next) => {
  const sessionId = req.header('x-vl-session') ?? undefined;
  log.info(
    { message: 'Request received', method: req.method, path: req.path },
    { sessionId },
  );
  next();
});

app.use('/api/todos', createTodoRoutes(db, log));

// Serve the React build. The Vite build outputs to ../public at repo root.
app.use(express.static(publicDir));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(port, () => {
  log.info({ message: 'Server started', port });
  // eslint-disable-next-line no-console
  console.log(`sample-todo listening on http://localhost:${port}`);
});

// Without this, a busy port emits an unhandled 'error' event that crashes the
// process with a raw stack trace. The most common cause is a previous dev
// server (tsx watch / concurrently) that was left running. Fail with a clear,
// actionable message instead.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    log.error({ message: 'Port already in use', port });
    // eslint-disable-next-line no-console
    console.error(
      `\n✖ Port ${port} is already in use — another instance is probably still running.\n` +
        `  Free it:  lsof -ti tcp:${port} | xargs kill\n` +
        `  Or change PORT in .env\n`,
    );
    process.exit(1);
  }
  throw err;
});
