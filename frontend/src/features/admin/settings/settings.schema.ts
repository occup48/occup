import { z } from "zod";

export const generalSettingsSchema = z.object({
  restaurantName: z.string()
    .trim()
    .min(2, "Restaurant name must be at least 2 characters.")
    .max(100, "Restaurant name must be 100 characters or fewer."),
});

const timeValueSchema = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d$/,
  "Enter a valid time in 24-hour format.",
);

export const operatingHoursSchema = z.object({
  openingTime: timeValueSchema,
  closingTime: timeValueSchema,
}).refine((values) => values.closingTime > values.openingTime, {
  path: ["closingTime"],
  message: "Closing time must be later than opening time.",
});

function minutesInputSchema(minimum: number, maximum: number) {
  return z.string().trim().superRefine((value, context) => {
    if (!/^\d+$/.test(value)) {
      context.addIssue({ code: "custom", message: "Enter a whole number of minutes." });
      return;
    }
    const minutes = Number(value);
    if (minutes < minimum) {
      context.addIssue({ code: "custom", message: `Use at least ${minimum} minutes.` });
    }
    if (minutes > maximum) {
      context.addIssue({ code: "custom", message: `Use ${maximum} minutes or fewer.` });
    }
  });
}

export const bookingRulesSchema = z.object({
  reservationDuration: minutesInputSchema(30, 240),
  bookingInterval: minutesInputSchema(15, 120),
});

export type GeneralSettingsValues = z.infer<typeof generalSettingsSchema>;
export type OperatingHoursValues = z.infer<typeof operatingHoursSchema>;
export type BookingRulesInput = z.infer<typeof bookingRulesSchema>;
export type BookingRulesValues = BookingRulesInput;
