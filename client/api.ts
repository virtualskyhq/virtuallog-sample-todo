import type { BrowserLogger } from './log';
import { getAccessToken } from './session';

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

export type Api = {
  login(userName: string, sessionId: string): Promise<{ accessToken: string }>;
  logout(): Promise<void>;
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
    const token = getAccessToken();
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;

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
    login: (userName, sessionId) =>
      request<{ accessToken: string }>('POST', '/auth/login', { userName, sessionId }),
    logout: () => request<void>('POST', '/auth/logout'),
    list: () => request<Todo[]>('GET', '/todos'),
    create: (title) => request<Todo>('POST', '/todos', { title }),
    toggle: (id) => request<Todo>('PATCH', `/todos/${id}/toggle`),
    remove: (id) => request<void>('DELETE', `/todos/${id}`),
    clear: () => request<void>('DELETE', '/todos'),
    triggerServerError: () => request<void>('POST', '/todos/_demo/error'),
  };
};
