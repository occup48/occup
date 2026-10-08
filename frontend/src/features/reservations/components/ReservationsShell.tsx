import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/features/auth/auth.context";

/** Page frame (skip link, navbar, footer) shared by the reservations pages. */
export function ReservationsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        {children}
      </main>
      <Footer />
    </>
  );
}

/** Shows its children to signed-in guests; everyone else is sent to sign in and brought back here. */
export function RequireSignIn({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <ReservationsShell>
        <p role="status" className="py-16 text-center text-sm text-muted-foreground">
          Checking your sign-in...
        </p>
      </ReservationsShell>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
