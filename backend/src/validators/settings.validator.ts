import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateSettingsSchema = z
  .object({
    restaurantName: z
      .string()
      .trim()
      .min(2, "Restaurant name must be at least 2 characters")
      .max(100, "Restaurant name cannot exceed 100 characters")
      .optional(),

    openingTime: z
      .string()
      .regex(timeRegex, "Opening time must use HH:mm format")
      .optional(),

    closingTime: z
      .string()
      .regex(timeRegex, "Closing time must use HH:mm format")
      .optional(),

    reservationDuration: z
      .number()
      .int()
      .min(30, "Reservation duration must be at least 30 minutes")
      .max(240, "Reservation duration cannot exceed 240 minutes")
      .optional(),

    bookingInterval: z
      .number()
      .int()
      .min(15, "Booking interval must be at least 15 minutes")
      .max(120, "Booking interval cannot exceed 120 minutes")
      .optional(),
  })

  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one setting to update",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
