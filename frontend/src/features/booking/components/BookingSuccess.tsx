import type { Reservation } from "../types/booking";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  reservation: Reservation;
  onBookAnother: () => void;
}

export function BookingSuccess({ reservation, onBookAnother }: Props) {
  return (
    <div className="text-center space-y-4">
      <h2 className="text-xl font-bold">Reservation Confirmed!</h2>
      <p className="text-muted-foreground">Your table has been successfully booked.</p>

      <div className="rounded-lg border p-4 text-left text-sm space-y-2">
        <div>
          <span className="font-medium">Date:</span> {reservation.reservationDate}
        </div>
        <div>
          <span className="font-medium">Time:</span> {reservation.startTime} –{" "}
          {reservation.endTime}
        </div>
        <div>
          <span className="font-medium">Party Size:</span> {reservation.partySize}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/" className="flex-1">
          <Button variant="outline" className="w-full">
            Home
          </Button>
        </Link>
        <Button onClick={onBookAnother} className="flex-1">
          Book Another Table
        </Button>
      </div>
    </div>
  );
}