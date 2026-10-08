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
  key: string;
  reservation: CustomerReservation | null;
  error: string | null;
  notFound: boolean;
}

/** One of the signed-in guest's reservations. `notFound` is true for a wrong id or someone else's. */
export function useReservation(id: string) {
  const { accessToken } = useAuth();
  const expireSession = useExpireSession();
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${id}:${version}`;

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    reservationsService.get(id, accessToken, controller.signal).then(
      (reservation) => setLoaded({ key, reservation, error: null, notFound: false }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ReservationsError && error.status === 401) {
          expireSession();
          return;
        }
        const notFound = error instanceof ReservationsError && error.status === 404;
        setLoaded((previous) => ({
          key,
          reservation: notFound ? null : (previous?.reservation ?? null),
          error: notFound ? null : getReservationsError(error),
          notFound,
        }));
      },
    );
    return () => controller.abort();
  }, [accessToken, id, key, expireSession]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  const replace = useCallback(
    (updated: CustomerReservation) =>
      setLoaded((previous) => (previous ? { ...previous, reservation: updated } : previous)),
    [],
  );

  const isCurrent = loaded?.key === key;
  return {
    reservation: loaded?.reservation ?? null,
    error: isCurrent ? loaded.error : null,
    notFound: isCurrent ? loaded.notFound : false,
    isLoading: !isCurrent,
    reload,
    replace,
  };
}
