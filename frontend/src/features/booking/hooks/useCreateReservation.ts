import { useState } from "react";
import { bookingService, getBookingError } from "../services/booking.service";
import type { CreateReservationInput, Reservation } from "../types/booking";
import { useAuth } from "../../auth/auth.context";

export function useCreateReservation() {
  const { accessToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (input: CreateReservationInput): Promise<Reservation | null> => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (!accessToken) {
        setError("Please sign in to book a table.");
        return null;
      }
      return await bookingService.createReservation(input, accessToken);
    } catch (err) {
      setError(getBookingError(err));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error };
}