import { NavLink } from "react-router-dom";

export function AuthTabs() {
  return (
    <nav className="auth-tabs" aria-label="Account access">
      <NavLink to="/signin" end>
        Sign in
      </NavLink>
      <NavLink to="/signup" end>
        Create account
      </NavLink>
    </nav>
  );
}
