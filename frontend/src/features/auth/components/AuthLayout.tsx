import { useEffect } from "react";
import { Link } from "react-router-dom";
import restaurant from "@/assets/images/about-image.png";
import logo from "@/assets/images/logo.png";
import logoLight from "@/assets/images/logo-light.png";
import { Card } from "@/components/ui/card";
import { AuthForm } from "./AuthForm";
import { AuthTabs } from "./AuthTabs";
import type { AuthMode } from "../types/auth";
import "../auth.css";

export function AuthLayout({ mode }: { mode: AuthMode }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${mode === "signin" ? "Sign in" : "Create account"} · Occup`;
    return () => {
      document.title = previous;
    };
  }, [mode]);

  return (
    <main className="auth-page">
      <a className="skip-link" href="#auth-heading">
        Skip to authentication
      </a>
      <div className="auth-shell">
        <aside className="auth-visual" aria-label="Dining at Occup">
          <img
            className="auth-restaurant-image"
            src={restaurant}
            alt="An elegant restaurant with warmly lit tables set for dinner"
            fetchPriority="high"
          />
          <div className="auth-visual-overlay" />
          <Link
            to="/"
            className="auth-logo auth-desktop-logo"
            aria-label="Occup home"
          >
            <img src={logoLight} alt="Occup" />
          </Link>
          <div className="auth-story">
            <h2>
              Your table
              <br />
              is waiting.
            </h2>
            <p>
              Discover, reserve, and enjoy
              <br className="auth-story-break" /> the best dining experiences.
            </p>
          </div>
        </aside>
        <section className="auth-panel" aria-labelledby="auth-heading">
          <Link
            to="/"
            className="auth-logo auth-mobile-logo"
            aria-label="Occup home"
          >
            <img src={logo} alt="Occup" />
          </Link>
          <Card className="auth-card">
            <AuthTabs />
            <AuthForm key={mode} mode={mode} />
          </Card>
        </section>
      </div>
    </main>
  );
}
