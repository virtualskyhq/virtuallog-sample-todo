// Per-visitor identity, kept in localStorage. This is the only place that
// knows the storage keys — the logger reads identity through here, the login
// page writes it through here. Connection config (domain + API key) is NOT
// here: that lives in .env and is read directly by the logger.

const KEYS = {
  userName: 'vl-user-name',
  sessionId: 'vl-session-id',
} as const;

const read = (key: string): string | null =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(key);

export const getUserName = (): string | null => read(KEYS.userName);
export const getSessionId = (): string | null => read(KEYS.sessionId);

export const saveSession = (identity: { userName: string; sessionId: string }): void => {
  localStorage.setItem(KEYS.userName, identity.userName);
  localStorage.setItem(KEYS.sessionId, identity.sessionId);
};

export const clearSession = (): void => {
  localStorage.removeItem(KEYS.userName);
  localStorage.removeItem(KEYS.sessionId);
};

// A userName is the minimum needed to consider a visitor "logged in".
export const hasIdentity = (): boolean => !!getUserName();

export const generateSessionId = (length = 16): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};
