import { randomUUID } from 'crypto';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type Db = {
  list(): Todo[];
  create(title: string): Todo;
  toggle(id: string): Todo | null;
  remove(id: string): boolean;
};

// In-memory store on purpose: zero setup for someone cloning the repo.
// On Lambda this means each cold start has empty state — that's fine for a
// demo. Swap for SQLite / Postgres / Dynamo in a real app.
export const createDb = (): Db => {
  const todos = new Map<string, Todo>();

  return {
    list: () =>
      Array.from(todos.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    create: (title) => {
      const todo: Todo = {
        id: randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.set(todo.id, todo);
      return todo;
    },
    toggle: (id) => {
      const todo = todos.get(id);
      if (!todo) return null;
      const updated: Todo = { ...todo, completed: !todo.completed };
      todos.set(id, updated);
      return updated;
    },
    remove: (id) => todos.delete(id),
  };
};
