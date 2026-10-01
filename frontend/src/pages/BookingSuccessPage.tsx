import { Navigate, useLocation } from "react-router-dom";
import { BookingSuccess } from "@/features/booking/components/BookingSuccess";
import type { Reservation } from "@/features/booking/types/booking";

const BookingSuccessPage = () => {
  const location = useLocation();
  const reservation = (location.state as { reservation?: Reservation } | null)?.reservation;

  if (!reservation) {
    return <Navigate to="/booking" replace />;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <BookingSuccess
        reservation={reservation}
        onBookAnother={() => (window.location.href = "/booking")}
      />
    </div>
  );
};

export default BookingSuccessPage;