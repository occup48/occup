import { z } from "zod";

const todayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currentTimeStr = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

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