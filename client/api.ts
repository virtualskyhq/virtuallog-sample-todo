import type { BrowserLogger } from './log';
import { getSessionId, getUserName } from './session';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type Api = {
  list(): Promise<Todo[]>;
  create(title: string): Promise<Todo>;
  toggle(id: string): Promise<Todo>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  triggerServerError(): Promise<void>;
};

export const createApi = (logger: BrowserLogger): Api => {
  const request = async <T,>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const sessionId = getSessionId();
    const userName = getUserName();
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (sessionId) headers['x-vl-session'] = sessionId;
    if (userName) headers['x-vl-user'] = userName;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const detail = `${method} ${path} -> ${res.status}`;
      logger.error('API error', { method, path, status: res.status, error: detail });
      throw new Error(detail);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  };

  return {
    list: () => request<Todo[]>('GET', '/todos'),
    create: (title) => request<Todo>('POST', '/todos', { title }),
    toggle: (id) => request<Todo>('PATCH', `/todos/${id}/toggle`),
    remove: (id) => request<void>('DELETE', `/todos/${id}`),
    clear: () => request<void>('DELETE', '/todos'),
    triggerServerError: () => request<void>('POST', '/todos/_demo/error'),
  };
};
