import { z } from "zod";
import type { CustomerReservation } from "../types/reservations";

const reservationSchema = z.object({
  id: z.string(),
  reservationDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  partySize: z.number(),
  status: z.enum(["confirmed", "cancelled", "completed"]),
  specialRequests: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  table: z
    .object({
      id: z.string(),
      tableNumber: z.string(),
      location: z.string().nullable(),
      capacity: z.number(),
    })
    .nullable(),
  canCancel: z.boolean(),
});

const listSchema = z.object({
  success: z.literal(true),
  data: z.object({ reservations: z.array(reservationSchema) }),
});

const oneSchema = z.object({
  success: z.literal(true),
  data: z.object({ reservation: reservationSchema }),
});

export type ReservationsAction = "list" | "detail" | "cancel";

export class ReservationsError extends Error {
  status: number;
  code: string | undefined;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = "ReservationsError";
    this.status = status;
    this.code = code;
  }
}

function getBase(): string {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new ReservationsError("Reservations are temporarily unavailable. Please try again later.");
  }
  return base;
}

function errorMessage(action: ReservationsAction, status: number, code?: string): string {
  if (status === 401) return "Please sign in to see your reservations.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 404) return "We couldn't find that reservation.";
  if (action === "cancel") {
    if (code === "ALREADY_CANCELLED") return "This reservation has already been cancelled.";
    if (status === 409) return "This reservation can no longer be cancelled.";
    if (status === 400) return "We couldn't cancel that reservation.";
    return "We couldn't cancel your reservation. Please try again.";
  }
  if (action === "detail") return "We couldn't load this reservation. Please try again.";
  return "We couldn't load your reservations. Please try again.";
}

async function requestJson(
  action: ReservationsAction,
  path: string,
  method: "GET" | "PATCH",
  accessToken: string,
  signal?: AbortSignal,
) {
  const base = getBase();
  let response: Response;
  try {
    response = await fetch(`${base}/api/reservations${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ReservationsError("We couldn't reach Occup. Check your connection and try again.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const code = typeof body?.code === "string" ? body.code : undefined;
    throw new ReservationsError(errorMessage(action, response.status, code), response.status, code);
  }
  return body;
}

function parseOne(body: unknown, action: ReservationsAction): CustomerReservation {
  const result = oneSchema.safeParse(body);
  if (!result.success) throw new ReservationsError(errorMessage(action, 500));
  return result.data.data.reservation;
}

export const reservationsService = {
  async list(accessToken: string, signal?: AbortSignal): Promise<CustomerReservation[]> {
    const body = await requestJson("list", "", "GET", accessToken, signal);
    const result = listSchema.safeParse(body);
    if (!result.success) throw new ReservationsError(errorMessage("list", 500));
    return result.data.data.reservations;
  },

  async get(id: string, accessToken: string, signal?: AbortSignal): Promise<CustomerReservation> {
    const body = await requestJson("detail", `/${encodeURIComponent(id)}`, "GET", accessToken, signal);
    return parseOne(body, "detail");
  },

  async cancel(id: string, accessToken: string, signal?: AbortSignal): Promise<CustomerReservation> {
    const body = await requestJson(
      "cancel",
      `/${encodeURIComponent(id)}/cancel`,
      "PATCH",
      accessToken,
      signal,
    );
    return parseOne(body, "cancel");
  },
};

export function getReservationsError(error: unknown): string {
  return error instanceof ReservationsError
    ? error.message
    : "Something went wrong. Please try again.";
}
