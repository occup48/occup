import type { Table } from "../types/booking";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div>
          <span className="font-medium">Date:</span> {date}
        </div>
        <div>
          <span className="font-medium">Time:</span> {time}
        </div>
        <div>
          <span className="font-medium">Party Size:</span> {partySize}
        </div>
        <div>
          <span className="font-medium">Table:</span> {table.tableNumber}
          {table.location ? ` — ${table.location}` : ""} ({table.capacity} seats)
        </div>
      </div>

      <div>
        <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
        <textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => onSpecialRequestsChange(e.target.value)}
          placeholder="e.g. Window seat, birthday celebration..."
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          rows={3}
          maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
        />
        <p className="text-xs text-muted-foreground text-right">
          {specialRequests.length}/{SPECIAL_REQUESTS_MAX_LENGTH}
        </p>
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting || confirmDisabled} className="flex-1">
          {isSubmitting ? "Confirming..." : "Confirm Reservation"}
        </Button>
      </div>
    </div>
  );
}