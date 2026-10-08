import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth.context";
import {
  getReservationsError,
  reservationsService,
  ReservationsError,
} from "../services/reservations.service";
import type { CustomerReservation } from "../types/reservations";
import { useExpireSession } from "./useExpireSession";

interface Loaded {
  version: number;
  reservations: CustomerReservation[] | null;
  error: string | null;
}

/** The signed-in guest's reservations. `reload` fetches again; `replace` swaps in a changed one. */
export function useReservations() {
  const { accessToken } = useAuth();
  const expireSession = useExpireSession();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    reservationsService.list(accessToken, controller.signal).then(
      (reservations) => setLoaded({ version, reservations, error: null }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ReservationsError && error.status === 401) {
          expireSession();
          return;
        }
        setLoaded((previous) => ({
          version,
          reservations: previous?.reservations ?? null,
          error: getReservationsError(error),
        }));
      },
    );
    return () => controller.abort();
  }, [accessToken, version, expireSession]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  const replace = useCallback((updated: CustomerReservation) => {
    setLoaded((previous) =>
      previous?.reservations
        ? {
            ...previous,
            reservations: previous.reservations.map((r) => (r.id === updated.id ? updated : r)),
          }
        : previous,
    );
  }, []);

  const isCurrent = loaded?.version === version;
  return {
    reservations: loaded?.reservations ?? null,
    error: isCurrent ? loaded.error : null,
    isLoading: !isCurrent,
    reload,
    replace,
  };
}
