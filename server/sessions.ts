import { randomUUID } from 'crypto';

export type Session = { userName: string; sessionId: string };

export type SessionStore = {
  create(userName: string, sessionId: string): string;
  get(token: string): Session | undefined;
  remove(token: string): void;
};

export const createSessionStore = (): SessionStore => {
  const store = new Map<string, Session>();
  return {
    create: (userName, sessionId) => {
      const token = randomUUID();
      store.set(token, { userName, sessionId });
      return token;
    },
    get: (token) => store.get(token),
    remove: (token) => { store.delete(token); },
  };
};
