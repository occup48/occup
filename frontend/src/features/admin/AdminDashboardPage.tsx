import { CalendarDays, CircleCheck, CircleX, Clock3 } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { DashboardStatCard } from "./DashboardStatCard";
import { QuickActions } from "./QuickActions";
import { ReservationTrends } from "./ReservationTrends";
import { TodaysReservations } from "./TodaysReservations";

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function AdminDashboardPage() {
  return <AdminLayout>
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here’s what’s happening today.</p>
        </div>
        <div className="admin-dashboard-date" aria-label={`Dashboard date: ${dateFormatter.format(new Date())}`}>
          <CalendarDays aria-hidden="true" />
          <span>{dateFormatter.format(new Date())}</span>
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="Reservation summary">
        <DashboardStatCard label="Total Reservations" icon={CalendarDays} tone="primary" />
        <DashboardStatCard label="Confirmed" icon={CircleCheck} tone="success" />
        <DashboardStatCard label="Pending" icon={Clock3} tone="warning" />
        <DashboardStatCard label="Cancelled" icon={CircleX} tone="danger" />
      </section>

      <div className="admin-dashboard-grid">
        <TodaysReservations />
        <div className="admin-dashboard-rail">
          <ReservationTrends />
          <QuickActions />
        </div>
      </div>
    </div>
  </AdminLayout>;
}
