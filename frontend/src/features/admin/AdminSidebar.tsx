import { DiningTableIcon } from "./DiningTableIcon";
import { ExternalLink, House, LogOut, Settings } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import logo from "@/assets/images/logo.png";
import { useAuth } from "@/features/auth/auth.context";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut } = useAuth();
  return <div className="admin-sidebar-content">
    <Link to="/admin/tables" className="admin-brand" aria-label="Occup admin" onClick={onNavigate}>
      <span className="brand-logo"><img src={logo} alt="Occup" /></span>
      <span className="admin-brand-caption">Restaurant Admin</span>
    </Link>
    <nav className="admin-navigation" aria-label="Admin navigation">
      <NavLink to="/admin" end className="admin-nav-link" onClick={onNavigate}><House aria-hidden="true" /><span>Dashboard</span></NavLink>
      <NavLink to="/admin/tables" className="admin-nav-link" onClick={onNavigate}><DiningTableIcon aria-hidden="true" /><span>Tables</span></NavLink>
      <button className="admin-nav-link" disabled title="Admin settings are not available yet"><Settings aria-hidden="true" /><span>Settings</span></button>
    </nav>
    <div className="admin-sidebar-footer">
      <Link to="/" className="admin-nav-link" onClick={onNavigate}><ExternalLink aria-hidden="true" /><span>View Site</span></Link>
      <button className="admin-nav-link" onClick={() => { onNavigate?.(); signOut(); }}><LogOut aria-hidden="true" /><span>Log out</span></button>
    </div>
  </div>;
}
