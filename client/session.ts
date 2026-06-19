let _userName: string | null = null;
let _sessionId: string | null = null;
let _accessToken: string | null = null;

export const getUserName = (): string | null => _userName;
export const getSessionId = (): string | null => _sessionId;
export const getAccessToken = (): string | null => _accessToken;

export const saveSession = (identity: { userName: string; sessionId: string }): void => {
  _userName = identity.userName;
  _sessionId = identity.sessionId;
};

export const saveAccessToken = (token: string): void => {
  _accessToken = token;
};

export const clearSession = (): void => {
  _userName = null;
  _sessionId = null;
  _accessToken = null;
};

export const hasIdentity = (): boolean => !!_accessToken;

export const generateSessionId = (length = 16): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};
