import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayTime } from "@/features/booking/utils/dates";
import type { CustomerReservation } from "../types/reservations";
import { describeTable, formatLongDate } from "../utils/reservation-view";

interface Props {
  reservation: CustomerReservation | null;
  isCancelling: boolean;
  error: string | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function CancelReservationDialog({
  reservation,
  isCancelling,
  error,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Dialog open={reservation !== null} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md" showCloseButton={!isCancelling}>
        <DialogHeader>
          <DialogTitle>Cancel this reservation?</DialogTitle>
          <DialogDescription>
            {reservation
              ? `${formatLongDate(reservation.reservationDate)} at ${formatDisplayTime(reservation.startTime)}, ${describeTable(reservation)}, ${reservation.partySize} ${reservation.partySize === 1 ? "guest" : "guests"}. Your table will be released and this can't be undone.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="min-h-11" disabled={isCancelling} onClick={onDismiss}>
            Keep reservation
          </Button>
          <Button
            variant="destructive"
            className="min-h-11 font-semibold text-red-700 hover:text-red-800"
            disabled={isCancelling}
            onClick={onConfirm}
          >
            {isCancelling && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {isCancelling ? "Cancelling..." : "Yes, cancel reservation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
