import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, CircleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RESTAURANT_TIMEZONE } from "@/features/restaurant/restaurant-timezone";
import { CancelReservationDialog } from "./components/CancelReservationDialog";
import { Notice, type NoticeMessage } from "./components/Notice";
import { ReservationCard } from "./components/ReservationCard";
import { useCancelReservation } from "./hooks/useCancelReservation";
import { useNow } from "./hooks/useNow";
import { useReservations } from "./hooks/useReservations";
import { splitReservations } from "./utils/reservation-view";

type Tab = "upcoming" | "past";

const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

export function ReservationsList() {
  const { reservations, error, isLoading, reload, replace } = useReservations();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("upcoming");
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

  const { upcoming, past } = splitReservations(reservations ?? [], now, RESTAURANT_TIMEZONE);
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See, review and cancel your bookings.
          </p>
        </div>
        <Link to="/booking" className={cn(buttonVariants(), "min-h-11 px-5")}>
          Book a table
        </Link>
      </header>

      {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

      <div role="tablist" aria-label="Reservations" className="flex gap-1 rounded-xl bg-muted p-1">
        {TABS.map(({ id, label }) => {
          const count = id === "upcoming" ? upcoming.length : past.length;
          const selected = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={selected}
              aria-controls="reservations-panel"
              onClick={() => setTab(id)}
              className={
                "min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors " +
                (selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {label}
              {reservations && <span className="ml-1.5 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      <div id="reservations-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-4">
        {isLoading && !reservations && (
          <div role="status" aria-label="Loading your reservations" className="space-y-4">
            {[0, 1].map((n) => (
              <div key={n} className="h-40 animate-pulse rounded-2xl border bg-muted/60" />
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p className="flex items-start gap-2">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
            <Button variant="outline" className="min-h-11" onClick={reload}>
              Try again
            </Button>
          </div>
        )}

        {reservations && shown.length === 0 && !error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
            <CalendarX2 aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {tab === "upcoming" ? "No upcoming reservations" : "No past reservations yet"}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {tab === "upcoming"
                ? "When you book a table, it will show up here."
                : "Cancelled and completed reservations will show up here."}
            </p>
            {tab === "upcoming" && (
              <Link to="/booking" className={cn(buttonVariants(), "mt-1 min-h-11 px-5")}>
                Book a table
              </Link>
            )}
          </div>
        )}

        {shown.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            now={now}
            onCancel={cancel.request}
          />
        ))}
      </div>

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
