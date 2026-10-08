import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/auth.context";

/**
 * A stable callback that signs the guest out after the API rejects their token.
 * Signing out sends them to the sign-in page, which brings them back afterwards.
 */
export function useExpireSession(): () => void {
  const { signOut } = useAuth();
  const latest = useRef(signOut);
  useEffect(() => {
    latest.current = signOut;
  });
  return useCallback(() => latest.current(), []);
}
