import { z } from "zod";

export const createReservationSchema = z.object({
  tableId: z.string().uuid(),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
  partySize: z.coerce.number().int().min(1).max(20),
  specialRequests: z.string().max(500).optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;