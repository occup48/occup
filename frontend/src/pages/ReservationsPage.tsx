import { RequireSignIn, ReservationsShell } from "@/features/reservations/components/ReservationsShell";
import { ReservationsList } from "@/features/reservations/ReservationsList";

const ReservationsPage = () => (
  <RequireSignIn>
    <ReservationsShell>
      <ReservationsList />
    </ReservationsShell>
  </RequireSignIn>
);

export default ReservationsPage;
