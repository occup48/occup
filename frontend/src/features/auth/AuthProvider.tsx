import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext } from "./auth.context";
import { AuthError, authService } from "./services/auth.service";
import { clearAuthToken, readAuthToken, storeAuthToken } from "./services/auth.storage";
import type { AuthSession } from "./types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [restoreToken, setRestoreToken] = useState(readAuthToken);
  const [session, setSession] = useState<AuthSession | null>(null);
  const isLoading = Boolean(restoreToken);
  const revision = useRef(0);

  useEffect(() => {
    const token = restoreToken;
    if (!token) return;
    const controller = new AbortController();
    const currentRevision = revision.current;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;
    const isCurrent = () => !controller.signal.aborted && currentRevision === revision.current;

    const restoreSession = async () => {
      if (!isCurrent()) return;
      try {
        const user = await authService.getUser(token, controller.signal);
        if (!isCurrent()) return;
        setSession({ user, accessToken: token });
        setRestoreToken(null);
      } catch (error: unknown) {
        if (!isCurrent()) return;
        if (error instanceof AuthError && [401, 403, 404].includes(error.status)) {
          clearAuthToken();
          setRestoreToken(null);
          return;
        }

        // Keep restoration pending through outages, with at most one request at a time.
        retryTimer = setTimeout(restoreSession, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    };

    void restoreSession();
    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
  }, [restoreToken]);

  function authenticate(nextSession: AuthSession, rememberMe = false) {
    revision.current += 1;
    storeAuthToken(nextSession.accessToken, rememberMe);
    setSession(nextSession);
    setRestoreToken(null);
  }

  function signOut() {
    revision.current += 1;
    clearAuthToken();
    setSession(null);
    setRestoreToken(null);
  }

  return <AuthContext value={{ user: session?.user ?? null, accessToken: session?.accessToken ?? null, isLoading, authenticate, signOut }}>
    {children}
  </AuthContext>;
}
