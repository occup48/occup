import { useState, useCallback, useRef } from "react";
import { bookingService, getBookingError } from "../services/booking.service";
import type { AvailabilitySearchParams, Table } from "../types/booking";

export function useAvailability() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (params: AvailabilitySearchParams): Promise<boolean> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const results = await bookingService.searchAvailability(params, controller.signal);
      if (controller.signal.aborted) return false;
      setTables(results);
      return true;
    } catch (err) {
      if (controller.signal.aborted) return false;
      setTables([]); // clear stale results so a failed search can't be mistaken for success
      setError(getBookingError(err));
      return false;
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  return { tables, isLoading, error, search };
}