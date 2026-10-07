import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, ExternalLink, LoaderCircle, LogOut, Menu } from "lucide-react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/images/logo.png";
import { useAuth } from "@/features/auth/auth.context";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdminSidebar } from "./AdminSidebar";
import "./admin.css";

export function RequireAdmin() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="admin-session-loading" role="status"><LoaderCircle className="size-6 animate-spin" aria-hidden="true" />Checking your session…</div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

export function AdminLayout({ search, children }: { search?: ReactNode; children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.firstName?.[0] || "A"}${user?.lastName?.[0] || ""}`.toUpperCase();

  return <div className="admin-shell">
    <a className="skip-link" href="#admin-main">Skip to main content</a>
    <aside className="admin-desktop-sidebar"><AdminSidebar /></aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-mobile-brand">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger className="admin-icon-button" aria-label="Open navigation"><Menu aria-hidden="true" /></SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Restaurant administration</SheetTitle>
              <SheetDescription className="sr-only">Navigate Occup’s admin sections or return to the restaurant site.</SheetDescription>
              <AdminSidebar onNavigate={() => setNavigationOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="brand-logo" aria-label="Occup admin"><img src={logo} alt="Occup" /></Link>
        </div>
        {search && <div className="admin-desktop-search">{search}</div>}
        <div className="admin-topbar-account">
          <button className="admin-notifications" type="button" disabled title="Notifications are not available yet" aria-label="Notifications are not available yet">
            <Bell aria-hidden="true" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="admin-profile" aria-label="Open admin account menu">
              <span className="admin-avatar">{initials}</span>
              <span className="admin-profile-text"><strong>{user?.firstName || "Admin"}</strong><span>Administrator</span></span>
              <ChevronDown className="admin-profile-chevron" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="max-w-64 px-3 py-2 text-xs break-words text-muted-foreground">Signed in as {user?.email}</div>
              <DropdownMenuItem onClick={() => navigate("/")}><ExternalLink />View Site</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}><LogOut />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main id="admin-main" className="admin-main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
