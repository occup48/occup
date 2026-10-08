import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, CircleAlert, Clock, MapPin, MessageSquareText, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDisplayTime } from "@/features/booking/utils/dates";
import { RESTAURANT_TIMEZONE } from "@/features/restaurant/restaurant-timezone";
import { CancelReservationDialog } from "./components/CancelReservationDialog";
import { Notice, type NoticeMessage } from "./components/Notice";
import { ReservationStatusBadge } from "./components/ReservationStatusBadge";
import { useCancelReservation } from "./hooks/useCancelReservation";
import { useNow } from "./hooks/useNow";
import { useReservation } from "./hooks/useReservation";
import {
  describeTable,
  displayStatus,
  formatLongDate,
  isUpcoming,
  referenceCode,
} from "./utils/reservation-view";

const BackLink = () => (
  <Link
    to="/reservations"
    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-ink hover:underline"
  >
    <ArrowLeft aria-hidden="true" className="size-4" />
    All reservations
  </Link>
);

export function ReservationDetails({ id }: { id: string }) {
  const { reservation, error, notFound, reload, replace } = useReservation(id);
  const now = useNow();
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const cancel = useCancelReservation({
    onCancelled: (updated) => {
      replace(updated);
      setNotice({ tone: "success", text: "Your reservation has been cancelled." });
    },
    onOutOfDate: (message) => {
      setNotice({ tone: "info", text: message });
      reload();
    },
  });

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div role="alert" className="rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">We couldn't find that reservation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been removed, or it belongs to another account.
          </p>
          <Link to="/reservations" className={cn(buttonVariants(), "mt-5 min-h-11 px-5")}>
            Back to my reservations
          </Link>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="space-y-4">
        <BackLink />
        {error ? (
          <div role="alert" className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p className="flex items-start gap-2">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
            <Button variant="outline" className="min-h-11" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : (
          <div
            role="status"
            aria-label="Loading your reservation"
            className="h-72 animate-pulse rounded-2xl border bg-muted/60"
          />
        )}
      </div>
    );
  }

  const status = displayStatus(reservation, now, RESTAURANT_TIMEZONE);
  const upcoming = isUpcoming(reservation, now, RESTAURANT_TIMEZONE);
  const locked = reservation.status === "confirmed" && upcoming && !reservation.canCancel;

  return (
    <div className="space-y-5">
      <BackLink />

      {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <article className="space-y-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reservation details</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Reference <span className="font-mono font-medium">{referenceCode(reservation.id)}</span>
            </p>
          </div>
          <ReservationStatusBadge status={status} />
        </header>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatLongDate(reservation.reservationDate)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">
                {formatDisplayTime(reservation.startTime)} – {formatDisplayTime(reservation.endTime)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="font-medium">{reservation.partySize}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <dt className="text-muted-foreground">Table</dt>
              <dd className="font-medium">{describeTable(reservation)}</dd>
            </div>
          </div>
          {reservation.specialRequests && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <MessageSquareText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <dt className="text-muted-foreground">Special requests</dt>
                <dd className="font-medium break-words">{reservation.specialRequests}</dd>
              </div>
            </div>
          )}
        </dl>

        {locked && (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            This reservation can no longer be cancelled online. Please contact the restaurant if your plans have changed.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {reservation.canCancel && (
            <Button
              variant="destructive"
              className="min-h-11 flex-1 font-semibold text-red-700 hover:text-red-800 sm:flex-none sm:px-6"
              onClick={() => cancel.request(reservation)}
            >
              Cancel reservation
            </Button>
          )}
          <Link
            to="/booking"
            className={cn(
              buttonVariants({ variant: reservation.canCancel ? "outline" : "default" }),
              "min-h-11 flex-1 sm:flex-none sm:px-6",
            )}
          >
            Book another table
          </Link>
        </div>
      </article>

      <CancelReservationDialog
        reservation={cancel.target}
        isCancelling={cancel.isCancelling}
        error={cancel.error}
        onConfirm={cancel.confirm}
        onDismiss={cancel.dismiss}
      />
    </div>
  );
}
