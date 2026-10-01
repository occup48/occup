import { useState } from "react";
import { bookingService, getBookingError, BookingError } from "../services/booking.service";
import type { CreateReservationInput, Reservation } from "../types/booking";
import { useAuth } from "../../auth/auth.context";

interface SubmitResult {
  reservation: Reservation | null;
  status: number | null;
}

export function useCreateReservation() {
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUncertain, setIsUncertain] = useState(false);

  const submit = async (input: CreateReservationInput): Promise<SubmitResult> => {
    setIsSubmitting(true);
    setError(null);
    setIsUncertain(false);
    try {
      if (!accessToken) {
        setError("Please sign in to book a table.");
        return { reservation: null, status: 401 };
      }
      const reservation = await bookingService.createReservation(input, accessToken);
      return { reservation, status: 201 };
    } catch (err) {
      if (err instanceof BookingError) {
        if (err.status === 0) {
          // Network/timeout failure — the server may have created the reservation
          // even though we never got the response. Don't offer a blind retry.
          setIsUncertain(true);
          setError(
            "We couldn't confirm whether your reservation went through. Please check My Reservations before trying again.",
          );
        } else {
          setError(getBookingError(err));
        }
        return { reservation: null, status: err.status };
      }
      setError(getBookingError(err));
      return { reservation: null, status: null };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error, isUncertain };
}