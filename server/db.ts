import { randomUUID } from 'crypto';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type Db = {
  list(userName: string): Todo[];
  create(userName: string, title: string): Todo;
  toggle(userName: string, id: string): Todo | null;
  remove(userName: string, id: string): boolean;
  clear(userName: string): void;
};

// In-memory store on purpose: zero setup for someone cloning the repo.
// On Lambda this means each cold start has empty state — that's fine for a
// demo. Swap for SQLite / Postgres / Dynamo in a real app.
export const createDb = (): Db => {
  const store = new Map<string, Map<string, Todo>>();

  const bucket = (userName: string): Map<string, Todo> => {
    let b = store.get(userName);
    if (!b) { b = new Map(); store.set(userName, b); }
    return b;
  };

  return {
    list: (userName) =>
      Array.from(bucket(userName).values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    create: (userName, title) => {
      const todo: Todo = {
        id: randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      bucket(userName).set(todo.id, todo);
      return todo;
    },
    toggle: (userName, id) => {
      const todos = bucket(userName);
      const todo = todos.get(id);
      if (!todo) return null;
      const updated: Todo = { ...todo, completed: !todo.completed };
      todos.set(id, updated);
      return updated;
    },
    remove: (userName, id) => bucket(userName).delete(id),
    clear: (userName) => bucket(userName).clear(),
  };
};
