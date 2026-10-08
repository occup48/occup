import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDisplayTime } from "@/features/booking/utils/dates";
import { RESTAURANT_TIMEZONE } from "@/features/restaurant/restaurant-timezone";
import type { CustomerReservation } from "../types/reservations";
import { describeTable, displayStatus, formatLongDate } from "../utils/reservation-view";
import { ReservationStatusBadge } from "./ReservationStatusBadge";

interface Props {
  reservation: CustomerReservation;
  now: Date;
  onCancel: (reservation: CustomerReservation) => void;
}

export function ReservationCard({ reservation, now, onCancel }: Props) {
  const status = displayStatus(reservation, now, RESTAURANT_TIMEZONE);
  const date = formatLongDate(reservation.reservationDate);

  return (
    <article
      aria-label={`Reservation on ${date}`}
      data-testid="reservation-card"
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-primary" />
          {date}
        </h3>
        <ReservationStatusBadge status={status} />
      </div>

      <dl className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Clock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <dd>
            {formatDisplayTime(reservation.startTime)} – {formatDisplayTime(reservation.endTime)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Guests</dt>
          <Users aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <dd>
            {reservation.partySize} {reservation.partySize === 1 ? "guest" : "guests"}
          </dd>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <dt className="sr-only">Table</dt>
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <dd>{describeTable(reservation)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={`/reservations/${reservation.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 flex-1 sm:flex-none")}
        >
          View details
        </Link>
        {reservation.canCancel && (
          <Button
            variant="destructive"
            className="min-h-11 flex-1 text-red-700 hover:text-red-800 sm:flex-none"
            onClick={() => onCancel(reservation)}
          >
            Cancel reservation
          </Button>
        )}
      </div>
    </article>
  );
}
