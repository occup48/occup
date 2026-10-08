import { Navigate, useParams } from "react-router-dom";
import { RequireSignIn, ReservationsShell } from "@/features/reservations/components/ReservationsShell";
import { ReservationDetails } from "@/features/reservations/ReservationDetails";

const ReservationDetailsPage = () => {
  const { id } = useParams();
  if (!id) return <Navigate to="/reservations" replace />;

  return (
    <RequireSignIn>
      <ReservationsShell>
        <ReservationDetails id={id} />
      </ReservationsShell>
    </RequireSignIn>
  );
};

export default ReservationDetailsPage;
