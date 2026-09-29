import { createContext, useContext } from "react";
import type { AuthSession, AuthUser } from "./types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  authenticate: (session: AuthSession, rememberMe?: boolean) => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
