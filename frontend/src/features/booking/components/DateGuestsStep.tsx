import { lazy, Suspense, useState } from "react";
import { ArrowRight, CalendarDays, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDisplayDate, parseDateString, toDateString } from "../utils/dates";

const Calendar = lazy(() =>
  import("@/components/ui/calendar").then((module) => ({ default: module.Calendar })),
);

const CARD =
  "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

interface Props {
  /** The chosen day, "YYYY-MM-DD". */
  date: string;
  partySize: number;
  /** The first bookable day in restaurant time, "YYYY-MM-DD". */
  minDate: string;
  onDateChange: (date: string) => void;
  onPartySizeChange: (partySize: number) => void;
  onNext: () => void;
}

export function DateGuestsStep({
  date,
  partySize,
  minDate,
  onDateChange,
  onPartySizeChange,
  onNext,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  // 1 to 8 guests like the homepage widget; a larger prefilled party stays selectable.
  const partySizes = Array.from({ length: Math.max(8, partySize) }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} ${index === 0 ? "Guest" : "Guests"}`,
  }));

  const handleSelectDate = (selected: Date) => {
    onDateChange(toDateString(selected));
    setCalendarOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Let's Find Your Table</h1>
        <p className="text-sm text-muted-foreground">
          Choose your preferred date and the number of guests.
        </p>
      </div>

      <div className="space-y-3">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger aria-label={`Date, ${formatDisplayDate(date)}`} className={CARD}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays aria-hidden="true" className="size-6" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-lg font-semibold">{formatDisplayDate(date)}</span>
            </span>
            <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto max-w-[calc(100vw-24px)] p-2">
            <Suspense
              fallback={
                <p role="status" className="w-64 p-6 text-sm text-muted-foreground">
                  Loading calendar...
                </p>
              }
            >
              <Calendar
                mode="single"
                required
                selected={parseDateString(date)}
                defaultMonth={parseDateString(date)}
                disabled={{ before: parseDateString(minDate) }}
                onSelect={handleSelectDate}
                className="[--cell-size:--spacing(9)] [&_button[data-selected-single=true]]:bg-primary-hover"
              />
            </Suspense>
          </PopoverContent>
        </Popover>

        <Select
          items={partySizes}
          value={String(partySize)}
          onValueChange={(value) => {
            if (value) onPartySizeChange(Number(value));
          }}
        >
          <SelectTrigger
            aria-label="Party size"
            className={`${CARD} h-auto justify-between data-[size=default]:h-auto`}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UsersRound aria-hidden="true" className="size-6" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-muted-foreground">Party Size</span>
              <SelectValue className="text-lg font-semibold" />
            </span>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start">
            {partySizes.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="min-h-11 px-3">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" onClick={onNext} className="h-12 w-full rounded-xl text-base">
        Next <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
