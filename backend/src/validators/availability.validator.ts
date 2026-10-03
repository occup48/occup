import { z } from "zod";

// Read at call time, not import time: index.ts loads .env.local after its imports run.
const restaurantTimezone = () => process.env.RESTAURANT_TIMEZONE ?? "Africa/Lagos";
const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: restaurantTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const currentTimeStr = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: restaurantTimezone(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const availabilityQuerySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .refine((val) => {
        const d = new Date(`${val}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
      }, "Date is not a valid calendar date")
      .refine((val) => val >= todayStr(), "Date cannot be in the past"),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
    partySize: z.coerce.number().int().min(1).max(20),
  })
  .superRefine((data, ctx) => {
    if (data.date === todayStr() && data.time < currentTimeStr()) {
      ctx.addIssue({
        code: "custom",
        message: "Time cannot be in the past",
        path: ["time"],
      });
    }
  });

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;