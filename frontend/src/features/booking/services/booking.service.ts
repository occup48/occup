import { z } from "zod";
import type {
  AvailabilitySearchParams,
  CreateReservationInput,
  Reservation,
  Table,
} from "../types/booking";

const tableSchema = z.object({
  id: z.string(),
  tableNumber: z.string(),
  capacity: z.number(),
  location: z.string().nullable(),
  isActive: z.boolean(),
});

const reservationSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  reservationDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  partySize: z.number(),
  specialRequests: z.string().nullable().optional(),
  status: z.enum(["confirmed", "cancelled", "completed"]),
});

const availabilityResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ tables: z.array(tableSchema) }),
});

const reservationResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ reservation: reservationSchema }),
});

type BookingAction = "availability" | "reservation";

export class BookingError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "BookingError";
    this.status = status;
  }
}

function getBase(): string {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (!base)
    throw new BookingError(
      "Booking is temporarily unavailable. Please try again later.",
    );
  return base;
}

function errorMessage(action: BookingAction, status: number, fallback?: string): string {
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status === 401) return "Please sign in to book a table.";
  if (status === 409) return "That table was just booked by someone else. Please choose another.";
  if (status === 400) return fallback ?? "Please check your booking details and try again.";
  if (action === "availability") return "We couldn't load table availability. Please try again.";
  return "We couldn't complete your reservation. Please try again in a moment.";
}

async function requestJson(
  action: BookingAction,
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new BookingError(
      "We couldn't reach Occup. Check your connection and try again.",
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const fallback = typeof body?.message === "string" ? body.message : undefined;
    throw new BookingError(errorMessage(action, response.status, fallback), response.status);
  }

  return body;
}

export const bookingService = {
  async searchAvailability(
    params: AvailabilitySearchParams,
    signal?: AbortSignal,
  ): Promise<Table[]> {
    const base = getBase();
    const query = new URLSearchParams({
      date: params.date,
      time: params.time,
      partySize: String(params.partySize),
    });

    const body = await requestJson(
      "availability",
      `${base}/api/availability?${query.toString()}`,
      { method: "GET" },
      signal,
    );

    const result = availabilityResponseSchema.safeParse(body);
    if (!result.success)
      throw new BookingError("We couldn't load table availability. Please try again.");
    return result.data.data.tables;
  },

  async createReservation(
    input: CreateReservationInput,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Reservation> {
    const base = getBase();

    const body = await requestJson(
      "reservation",
      `${base}/api/reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(input),
      },
      signal,
    );

    const result = reservationResponseSchema.safeParse(body);
    if (!result.success)
      throw new BookingError("We couldn't confirm your reservation. Please try again.");
    return result.data.data.reservation;
  },
};

export function getBookingError(error: unknown): string {
  return error instanceof BookingError ? error.message : "Something went wrong. Please try again.";
}