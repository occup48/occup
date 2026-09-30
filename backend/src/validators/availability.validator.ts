import { z } from "zod";

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
  partySize: z.coerce.number().int().min(1).max(20),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;