import { Router, type Request } from 'express';
import type { Db } from './db';
import type { ServerLogger } from './log';
import type { AuthRequest } from './server';

export const createTodoRoutes = (db: Db, log: ServerLogger): Router => {
  const router = Router();

  const auth = (req: Request): AuthRequest['auth'] => (req as AuthRequest).auth;

  router.get('/', (req, res) => {
    const { userName } = auth(req);
    res.json(db.list(userName));
  });

  router.post('/', (req, res) => {
    const { userName } = auth(req);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title) {
      log.warn('Validation failed', { field: 'title', reason: 'empty or not a string' });
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const todo = db.create(userName, title);
    log.info('Todo created', { todoId: todo.id, title: todo.title });
    res.status(201).json(todo);
  });

  router.patch('/:id/toggle', (req, res) => {
    const { userName } = auth(req);
    const todo = db.toggle(userName, req.params.id);
    if (!todo) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    log.info('Todo toggled', { todoId: todo.id, completed: todo.completed });
    res.json(todo);
  });

  router.delete('/', (req, res) => {
    const { userName } = auth(req);
    db.clear(userName);
    log.info('All todos cleared');
    res.status(204).end();
  });

  router.delete('/:id', (req, res) => {
    const { userName } = auth(req);
    const ok = db.remove(userName, req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    log.info('Todo deleted', { todoId: req.params.id });
    res.status(204).end();
  });

  // Playground endpoint: deliberately errors so the visitor can see an ERROR
  // log surface in VirtualLog.
  router.post('/_demo/error', (_req, res) => {
    const detail = 'Simulated server error from /api/todos/_demo/error';
    log.error('Simulated server error', { error: detail });
    res.status(500).json({ error: detail });
  });

  return router;
};
