import { ArrowLeft } from "lucide-react";
import type { Table } from "../types/booking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDisplayDate, formatDisplayTime } from "../utils/dates";
import { StepFooter } from "./StepFooter";

const SPECIAL_REQUESTS_MAX_LENGTH = 500;

interface Props {
  date: string;
  time: string;
  partySize: number;
  table: Table;
  specialRequests: string;
  onSpecialRequestsChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  confirmDisabled?: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function ReservationReview({
  date,
  time,
  partySize,
  table,
  specialRequests,
  onSpecialRequestsChange,
  onBack,
  onConfirm,
  isSubmitting,
  errorMessage,
  confirmDisabled,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Review Your Reservation</h1>
        <p className="text-sm text-muted-foreground">Check the details, then confirm.</p>
      </div>

      <dl className="divide-y rounded-2xl border bg-card px-4 text-sm shadow-sm">
        <Row label="Date" value={formatDisplayDate(date)} />
        <Row label="Time" value={formatDisplayTime(time)} />
        <Row label="Party Size" value={`${partySize} ${partySize === 1 ? "guest" : "guests"}`} />
        <Row
          label="Table"
          value={`${table.tableNumber}${table.location ? `, ${table.location}` : ""} (${table.capacity} seats)`}
        />
      </dl>

      <div className="space-y-2">
        <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
        <textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="e.g. Window seat, birthday celebration..."
          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          rows={3}
          maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
        />
        <p className="text-right text-xs text-muted-foreground">
          {specialRequests.length}/{SPECIAL_REQUESTS_MAX_LENGTH}
        </p>
      </div>

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
          onClick={onConfirm}
          disabled={isSubmitting || confirmDisabled}
          className="h-12 flex-[1.5] rounded-xl text-base"
        >
          {isSubmitting ? "Confirming..." : "Confirm Reservation"}
        </Button>
      </StepFooter>
    </div>
  );
}
