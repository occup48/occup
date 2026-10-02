import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFutureBookingTime } from "@/features/restaurant/utils/booking-time";
import { RESTAURANT_TIMEZONE } from "@/features/restaurant/restaurant-timezone";
import { groupTimeSlots, TIME_SLOTS, type TimeSlot } from "../constants/time-slots";
import { parseDateString } from "../utils/dates";
import { StepFooter } from "./StepFooter";

interface Props {
  /** The chosen day, "YYYY-MM-DD". */
  date: string;
  /** The selected slot as HH:mm, or an empty string. */
  time: string;
  isSearching: boolean;
  errorMessage?: string | null;
  onSelect: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function TimeStep({
  date,
  time,
  isSearching,
  errorMessage,
  onSelect,
  onBack,
  onNext,
}: Props) {
  const day = parseDateString(date);
  const now = new Date();
  const isAvailable = (slot: TimeSlot) =>
    isFutureBookingTime(day, slot.value, now, RESTAURANT_TIMEZONE);
  const anyAvailable = TIME_SLOTS.some(isAvailable);
  const selectedIsAvailable = TIME_SLOTS.some((slot) => slot.value === time && isAvailable(slot));
  const { afternoon, evening } = groupTimeSlots();

  const renderGroup = (title: string, slots: TimeSlot[]) => (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const selected = slot.value === time;
          const available = isAvailable(slot);
          return (
            <button
              key={slot.value}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onSelect(slot.value)}
              className={`h-12 rounded-full border text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : available
                    ? "bg-card hover:border-primary/50"
                    : "cursor-not-allowed bg-muted/50 text-muted-foreground line-through"
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Select a Time</h1>
        <p className="text-sm text-muted-foreground">
          Choose an available time for your reservation.
        </p>
      </div>

      {anyAvailable ? (
        <div className="space-y-6">
          {renderGroup("Afternoon", afternoon)}
          {renderGroup("Evening", evening)}
        </div>
      ) : (
        <p role="status" className="rounded-xl bg-muted p-4 text-sm">
          No times remain for this date. Go back and choose a later date.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      )}

      <StepFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-12 flex-1 rounded-xl text-base"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!selectedIsAvailable || isSearching}
          className="h-12 flex-[1.5] rounded-xl text-base"
        >
          {isSearching ? (
            "Checking..."
          ) : (
            <>
              Next <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>
      </StepFooter>
    </div>
  );
}
