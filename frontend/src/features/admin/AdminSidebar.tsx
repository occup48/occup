import { CalendarDays, House, LogOut, Settings, UtensilsCrossed } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/auth.context";
import logo from "@/assets/images/logo.png";
import { DiningTableIcon } from "./DiningTableIcon";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  return <div className="admin-sidebar-content">
    <Link to="/admin" className="admin-brand" aria-label="Occup admin" onClick={onNavigate}>
      <span className="brand-logo"><img src={logo} alt="Occup" /></span>
      <span className="admin-brand-caption">Restaurant Admin</span>
    </Link>
    <nav className="admin-navigation" aria-label="Admin navigation">
      <NavLink to="/admin" end className="admin-nav-link" onClick={onNavigate}><House aria-hidden="true" /><span>Dashboard</span></NavLink>
      <button className="admin-nav-link" type="button" disabled title="Reservations management is not available yet"><CalendarDays aria-hidden="true" /><span>Reservations</span></button>
      <NavLink to="/admin/tables" className="admin-nav-link" onClick={onNavigate}><DiningTableIcon aria-hidden="true" /><span>Tables</span></NavLink>
      <button className="admin-nav-link" type="button" disabled title="Menu management is not available yet"><UtensilsCrossed aria-hidden="true" /><span>Menu</span></button>
      <NavLink to="/admin/settings" className="admin-nav-link" onClick={onNavigate}><Settings aria-hidden="true" /><span>Settings</span></NavLink>
    </nav>
    <div className="admin-sidebar-footer">
      <button className="admin-nav-link" onClick={() => { onNavigate?.(); signOut(); }}><LogOut aria-hidden="true" /><span>Log out</span></button>
    </div>
  </div>;
}
