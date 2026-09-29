import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext } from "./auth.context";
import { AuthError, authService } from "./services/auth.service";
import { clearAuthToken, readAuthToken, storeAuthToken } from "./services/auth.storage";
import type { AuthSession } from "./types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialToken] = useState(readAuthToken);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialToken));
  const revision = useRef(0);

  useEffect(() => {
    if (!initialToken) return;
    const controller = new AbortController();
    const currentRevision = revision.current;
    authService.getUser(initialToken, controller.signal).then((user) => {
      if (!controller.signal.aborted && currentRevision === revision.current) {
        setSession({ user, accessToken: initialToken });
      }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && currentRevision === revision.current &&
        error instanceof AuthError && [401, 403, 404].includes(error.status)) clearAuthToken();
    }).finally(() => {
      if (!controller.signal.aborted && currentRevision === revision.current) setIsLoading(false);
    });
    return () => controller.abort();
  }, [initialToken]);

  function authenticate(nextSession: AuthSession, rememberMe = false) {
    revision.current += 1;
    storeAuthToken(nextSession.accessToken, rememberMe);
    setSession(nextSession);
    setIsLoading(false);
  }

  function signOut() {
    revision.current += 1;
    clearAuthToken();
    setSession(null);
    setIsLoading(false);
  }

  return <AuthContext value={{ user: session?.user ?? null, accessToken: session?.accessToken ?? null, isLoading, authenticate, signOut }}>
    {children}
  </AuthContext>;
}
