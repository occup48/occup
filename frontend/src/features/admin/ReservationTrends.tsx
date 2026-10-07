import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReservationTrends() {
  const [range, setRange] = useState("week");

  return <section className="admin-dashboard-card admin-trends-card" aria-labelledby="reservation-trends-title">
    <div className="admin-dashboard-card-heading">
      <h2 id="reservation-trends-title">Reservation Trends</h2>
      <Select value={range} onValueChange={(value) => { if (value) setRange(value); }}>
        <SelectTrigger className="admin-trend-range" aria-label="Trend date range"><SelectValue>{range === "week" ? "This Week" : "This Month"}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="admin-trend-chart" role="img" aria-label={`No reservation trend data is available for ${range === "week" ? "this week" : "this month"}`}>
      <div className="admin-trend-guides" aria-hidden="true"><span /><span /><span /><span /></div>
      <p>No trend data available</p>
    </div>
  </section>;
}
