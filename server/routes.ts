import { Router, type Request } from 'express';
import type { Db } from './db';
import type { ServerLogger } from './logger';

const SESSION_HEADER = 'x-vl-session';
const getSessionId = (req: Request): string | undefined =>
  req.header(SESSION_HEADER) ?? undefined;

export const createTodoRoutes = (db: Db, log: ServerLogger): Router => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(db.list());
  });

  router.post('/', (req, res) => {
    const sessionId = getSessionId(req);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

    if (!title) {
      log.warn(
        { message: 'Validation failed', field: 'title', reason: 'empty or not a string' },
        { sessionId },
      );
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const todo = db.create(title);
    log.info(
      { message: 'Todo created', todoId: todo.id, title: todo.title },
      { sessionId },
    );
    res.status(201).json(todo);
  });

  router.patch('/:id/toggle', (req, res) => {
    const sessionId = getSessionId(req);
    const todo = db.toggle(req.params.id);

    if (!todo) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    log.info(
      { message: 'Todo toggled', todoId: todo.id, completed: todo.completed },
      { sessionId },
    );
    res.json(todo);
  });

  router.delete('/:id', (req, res) => {
    const sessionId = getSessionId(req);
    const ok = db.remove(req.params.id);

    if (!ok) {
      res.status(404).json({ error: 'not found' });
      return;
    }

    log.info({ message: 'Todo deleted', todoId: req.params.id }, { sessionId });
    res.status(204).end();
  });

  // Playground endpoint: deliberately errors so the visitor can see an ERROR
  // log surface in VirtualLog.
  router.post('/_demo/error', (req, res) => {
    const sessionId = getSessionId(req);
    const detail = 'Simulated server error from /api/todos/_demo/error';
    log.error({ message: 'Simulated server error', error: detail }, { sessionId });
    res.status(500).json({ error: detail });
  });

  return router;
};
