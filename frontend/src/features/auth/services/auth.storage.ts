const TOKEN_KEY = "occup.accessToken";

export function readAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* Storage may be disabled. */ }
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Storage may be disabled. */ }
}

export function storeAuthToken(token: string, rememberMe: boolean) {
  clearAuthToken();
  try {
    (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // The active in-memory session still works when browser storage is blocked.
  }
}
