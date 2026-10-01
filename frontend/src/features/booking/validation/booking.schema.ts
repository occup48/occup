import { z } from "zod";

export const availabilitySearchSchema = z.object({
  date: z.string().min(1, "Please choose a date"),
  time: z.string().min(1, "Please choose a time"),
  partySize: z.coerce.number().int().min(1, "At least 1 guest").max(20, "Max 20 guests"),
});

export type AvailabilitySearchFormInput = z.input<typeof availabilitySearchSchema>;
export type AvailabilitySearchFormValues = z.output<typeof availabilitySearchSchema>;