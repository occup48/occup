import type { LucideIcon } from "lucide-react";

type DashboardStatCardProps = {
  label: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "danger";
};

export function DashboardStatCard({ label, icon: Icon, tone }: DashboardStatCardProps) {
  return <article className="admin-stat-card">
    <div className={`admin-stat-icon is-${tone}`}><Icon aria-hidden="true" /></div>
    <p className="admin-stat-value" aria-label={`${label}: unavailable`}>—</p>
    <h2>{label}</h2>
    <p className="admin-stat-note">Data unavailable</p>
  </article>;
}
