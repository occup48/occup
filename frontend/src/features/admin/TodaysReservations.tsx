export function TodaysReservations() {
  return <section className="admin-dashboard-card admin-today-card" aria-labelledby="today-reservations-title">
    <div className="admin-dashboard-card-heading">
      <h2 id="today-reservations-title">Today’s Reservations</h2>
    </div>
    <div className="admin-reservations-table-wrap">
      <table className="admin-reservations-table">
        <caption className="sr-only">Today’s reservation list</caption>
        <thead><tr><th scope="col">Time</th><th scope="col">Guest Name</th><th scope="col">Party Size</th><th scope="col">Table</th><th scope="col">Status</th></tr></thead>
        <tbody><tr><td className="admin-reservations-empty" colSpan={5}>
          <span>No reservation data is available yet.</span>
          <span>Today’s bookings will appear here when reservation reporting is connected.</span>
        </td></tr></tbody>
      </table>
    </div>
  </section>;
}
