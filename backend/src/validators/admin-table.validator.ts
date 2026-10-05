import { z } from "zod";

export const createAdminTableSchema = z.object({
  tableNumber: z
    .string()
    .trim()
    .min(1, "Table number is required")
    .max(20, "Table number must not exceed 20 characters"),

  capacity: z
    .number()
    .int()
    .positive("Capacity must be greater than 0"),

  location: z
    .string()
    .trim()
    .max(100, "Location must not exceed 100 characters")
    .optional(),

  isActive: z.boolean().optional(),
});

export const updateAdminTableSchema = createAdminTableSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateAdminTableInput = z.infer<typeof createAdminTableSchema>;
export type UpdateAdminTableInput = z.infer<typeof updateAdminTableSchema>;
