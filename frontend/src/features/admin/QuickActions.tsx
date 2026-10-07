import { ArrowUpRight, ExternalLink, TableProperties } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickActions() {
  return <section className="admin-dashboard-card admin-quick-actions" aria-labelledby="quick-actions-title">
    <h2 id="quick-actions-title">Quick Actions</h2>
    <div className="admin-quick-action-grid">
      <Link to="/admin/tables" className="admin-quick-action"><TableProperties aria-hidden="true" /><span>Manage Tables</span><ArrowUpRight className="admin-quick-action-arrow" aria-hidden="true" /></Link>
      <Link to="/" className="admin-quick-action"><ExternalLink aria-hidden="true" /><span>View Site</span><ArrowUpRight className="admin-quick-action-arrow" aria-hidden="true" /></Link>
    </div>
  </section>;
}
