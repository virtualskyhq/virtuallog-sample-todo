import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  userName: string;
  sessionId: string;
};

export const storage = new AsyncLocalStorage<RequestContext>();

export const getContext = (): Partial<RequestContext> => storage.getStore() ?? {};
