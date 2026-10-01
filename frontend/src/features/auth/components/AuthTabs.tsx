import { NavLink, useLocation } from "react-router-dom";

export function AuthTabs() {
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  // Carry the return address across the tabs, so a guest who switches between
  // signing in and creating an account still lands back where they started.
  const state = typeof from === "string" ? { from } : undefined;

  return (
    <nav className="auth-tabs" aria-label="Account access">
      <NavLink to="/signin" end state={state}>
        Sign in
      </NavLink>
      <NavLink to="/signup" end state={state}>
        Create account
      </NavLink>
    </nav>
  );
}