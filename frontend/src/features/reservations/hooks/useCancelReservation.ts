import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth.context";
import {
  getReservationsError,
  reservationsService,
  ReservationsError,
} from "../services/reservations.service";
import type { CustomerReservation } from "../types/reservations";
import { useExpireSession } from "./useExpireSession";

interface Options {
  /** The server cancelled it; here is the updated reservation. */
  onCancelled: (reservation: CustomerReservation) => void;
  /** The reservation had changed or gone since the page loaded (404 or 409); reload and tell the guest. */
  onOutOfDate: (message: string) => void;
}

/** The confirm-then-cancel flow shared by the list and the detail page. */
export function useCancelReservation({ onCancelled, onOutOfDate }: Options) {
  const { accessToken } = useAuth();
  const expireSession = useExpireSession();
  const [target, setTarget] = useState<CustomerReservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const request = (reservation: CustomerReservation) => {
    setError(null);
    setTarget(reservation);
  };

  const dismiss = () => {
    if (inFlight.current) return;
    setTarget(null);
    setError(null);
  };

  const confirm = async () => {
    if (!target || !accessToken || inFlight.current) return;
    inFlight.current = true;
    setIsCancelling(true);
    setError(null);
    try {
      const updated = await reservationsService.cancel(target.id, accessToken);
      setTarget(null);
      onCancelled(updated);
    } catch (err) {
      const status = err instanceof ReservationsError ? err.status : 0;
      if (status === 401) {
        setTarget(null);
        expireSession();
      } else if (status === 404 || status === 409) {
        setTarget(null);
        onOutOfDate(getReservationsError(err));
      } else {
        setError(getReservationsError(err));
      }
    } finally {
      inFlight.current = false;
      setIsCancelling(false);
    }
  };

  return { target, isCancelling, error, request, dismiss, confirm };
}
