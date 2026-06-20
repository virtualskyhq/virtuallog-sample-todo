import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createDb } from './db';
import log from './log';
import { createSessionStore, type Session } from './sessions';
import { storage } from './context';
import { createTodoRoutes } from './routes';

const port = Number(process.env.PORT) || 3000;
// Resolved from cwd so the same path works whether tsx is running the source
// (cwd = repo root, __dirname = server/) or node is running the build
// (cwd = repo root, __dirname = dist/server/). All npm scripts launch from
// the repo root, so cwd is the stable reference.
const publicDir = path.resolve(process.cwd(), 'public');

const db = createDb();
const sessions = createSessionStore();
const app = express();

app.use(express.json());

// Request log middleware.
app.use((req: Request, _res: Response, next: NextFunction) => {
  log.info('Request received', { method: req.method, path: req.path });
  next();
});

// Auth routes — no token required.
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { userName, sessionId } = req.body ?? {};
  if (typeof userName !== 'string' || !userName.trim()) {
    res.status(400).json({ error: 'userName is required' });
    return;
  }
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }
  const token = sessions.create(userName.trim(), sessionId.trim());
  log.info('User logged in', { userName: userName.trim(), sessionId: sessionId.trim() });
  res.json({ accessToken: token });
});

// Extracts and validates the Bearer token, then attaches the session to req.
export type AuthRequest = Request & { auth: Session; token: string };

const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice(7);
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: 'invalid or expired token' });
    return;
  }
  (req as AuthRequest).auth = session;
  (req as AuthRequest).token = token;
  next();
};

// Runs after requireAuth — binds the session to AsyncLocalStorage so every
// log call within this request automatically carries userName + sessionId.
const withContext = (req: Request, _res: Response, next: NextFunction): void => {
  const { userName, sessionId } = (req as AuthRequest).auth;
  storage.run({ userName, sessionId }, next);
};

app.post('/api/auth/logout', requireAuth, withContext, (req: Request, res: Response) => {
  const { token } = req as AuthRequest;
  sessions.remove(token);
  log.info('User logged out');
  res.status(204).end();
});

app.use('/api/todos', requireAuth, withContext, createTodoRoutes(db, log));

// Serve the React build. The Vite build outputs to ../public at repo root.
app.use(express.static(publicDir));
app.get(/^(?!\/api).*/, (_req, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(port, () => {
  log.info('Server started', { port });
  // eslint-disable-next-line no-console
  console.log(`sample-todo listening on http://localhost:${port}`);
});

// Without this, a busy port emits an unhandled 'error' event that crashes the
// process with a raw stack trace. The most common cause is a previous dev
// server (tsx watch / concurrently) that was left running. Fail with a clear,
// actionable message instead.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    log.error('Port already in use', { port });
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
