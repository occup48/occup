import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { ArrowRight, CalendarDays, ChevronDown, Clock3, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
const Calendar = lazy(() => import("@/components/ui/calendar").then((module) => ({ default: module.Calendar })));
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { isFutureBookingTime } from "@/features/restaurant/utils/booking-time";

const partySizes = Array.from({ length: 8 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1} ${index === 0 ? "Guest" : "Guests"}`,
}));
const times = Array.from({ length: 20 }, (_, index) => {
  const hour = 12 + Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  return {
    value: `${hour}:${minutes}`,
    label: `${hour % 12 || 12}:${minutes} PM`,
  };
});

export const BookingSearch = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => addDays(startOfDay(new Date()), 1));
  const [guests, setGuests] = useState("2");
  const [time, setTime] = useState("19:30");
  const [now, setNow] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showMobileTime, setShowMobileTime] = useState(false);

  // Refresh at minute boundaries so an open selector cannot retain elapsed slots.
  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(new Date()), 60_000 - (Date.now() % 60_000));
    return () => window.clearTimeout(timeout);
  }, [now]);

  const availableTimes = times.filter(({ value }) => isFutureBookingTime(date, value, now));
  const timeError = availableTimes.length === 0
    ? "No times remain for this date. Please choose a later date."
    : !isFutureBookingTime(date, time, now)
      ? "This time has passed. Please choose a later time."
      : undefined;

  const handleDateChange = (selected: Date) => {
    const currentTime = new Date();
    setNow(currentTime);
    setDate(selected);
    if (!isFutureBookingTime(selected, time, currentTime)) {
      setTime(times.find(({ value }) => isFutureBookingTime(selected, value, currentTime))?.value ?? "");
    }
    setCalendarOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Recheck independently of the UI clock, including after a background tab resumes.
    const currentTime = new Date();
    if (!isFutureBookingTime(date, time, currentTime)) {
      setNow(currentTime);
      setShowMobileTime(true);
      return;
    }
    navigate({
      pathname: "/booking",
      search: new URLSearchParams({ date: format(date, "yyyy-MM-dd"), guests, time }).toString(),
    });
  }

  return (
    <form aria-label="Find a table" onSubmit={handleSubmit} className="rounded-xl border border-border/70 bg-white p-3 text-foreground shadow-[0_6px_24px_rgb(17_24_39/7%)] sm:p-4">
      <div className="grid min-w-0 grid-cols-2 items-center gap-y-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.08fr]">
        <div className="min-w-0 border-r border-border/70 pr-2 sm:pr-4">
          <Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (open) setNow(new Date()); }}>
            <PopoverTrigger className="booking-trigger" aria-label={`Date, ${format(date, "MMMM d, yyyy")}`}>
              <span className="booking-icon"><CalendarDays aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <span className="text-[11px] font-semibold sm:text-xs">Date</span>
                <span className="whitespace-nowrap text-[11px] sm:text-sm">{format(date, "MMM d, yyyy")}</span>
              </span>
              <ChevronDown aria-hidden="true" className="size-3 shrink-0 text-muted-foreground sm:size-4" />
            </PopoverTrigger>
            <PopoverContent align="start" aria-label="Choose a reservation date" className="w-auto max-w-[calc(100vw-24px)] p-2">
              <Suspense fallback={<p role="status" className="w-64 p-6 text-sm text-muted-foreground">Loading calendar…</p>}>
              <Calendar mode="single" required selected={date} defaultMonth={date}
                disabled={{ before: startOfDay(now) }}
                onSelect={handleDateChange}
                className="[--cell-size:--spacing(9)] [&_button[data-selected-single=true]]:bg-primary-hover" />
              </Suspense>
            </PopoverContent>
          </Popover>
        </div>
        <div className="min-w-0 pl-2 sm:border-r sm:border-border/70 sm:px-4 sm:py-6">
          <Select items={partySizes} value={guests} onValueChange={(value) => { if (value) setGuests(value); }}>
            <SelectTrigger className="booking-trigger" aria-label="Party size">
              <span className="booking-icon"><UsersRound aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <span className="text-[11px] font-semibold sm:text-xs">Party Size</span>
                <SelectValue className="text-[11px] sm:text-sm" />
              </span>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              {partySizes.map(({ value, label }) => <SelectItem key={value} value={value} className="min-h-11 px-3">{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className={`${showMobileTime ? "col-span-2 flex" : "hidden"} min-w-0 sm:col-span-1 sm:flex sm:px-4`}>
          <Select items={times} value={time || null} disabled={availableTimes.length === 0}
            onOpenChange={(open) => { if (open) setNow(new Date()); }}
            onValueChange={(value) => { if (value) { setTime(value); setNow(new Date()); } }}>
            <SelectTrigger className="booking-trigger" aria-label="Time" aria-invalid={Boolean(timeError)} aria-describedby={timeError ? "booking-time-error" : undefined}>
              <span className="booking-icon"><Clock3 aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <span className="text-[11px] font-semibold sm:text-xs">Time</span>
                <SelectValue className="text-xs sm:text-sm" placeholder="No times left" />
              </span>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              {times.map(({ value, label }) => <SelectItem key={value} value={value} disabled={!isFutureBookingTime(date, value, now)} className="min-h-11 px-3">{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={Boolean(timeError)} aria-describedby={timeError ? "booking-time-error" : undefined} className="primary-button col-span-2 w-full sm:col-span-3 lg:col-span-1">
          Check Availability <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {timeError && (
        <p id="booking-time-error" role="alert" className="mt-3 text-sm text-foreground">
          {timeError}
        </p>
      )}
      <button type="button" onClick={() => setShowMobileTime(!showMobileTime)} aria-expanded={showMobileTime}
        className="mx-auto mt-1 flex min-h-8 items-center gap-1 text-[11px] text-muted-foreground sm:hidden">
        {showMobileTime ? "Hide time" : `${times.find((option) => option.value === time)?.label ?? "No times left"} · Change time`}
        <ChevronDown aria-hidden="true" className={`size-3 transition-transform ${showMobileTime ? "rotate-180" : ""}`} />
      </button>
    </form>
  );
}
