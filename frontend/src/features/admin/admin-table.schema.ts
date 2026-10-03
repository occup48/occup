import { z } from "zod";

export const tableSchema = z.object({
  // The current database column is varchar(10), even though the API accepts 20.
  tableNumber: z.string().trim().min(1, "Table number is required").max(10, "Use 10 characters or fewer"),
  capacity: z.coerce.number<string | number>({ error: "Enter a valid capacity" })
    .int("Capacity must be a whole number").positive("Capacity must be greater than 0")
    .max(2147483647, "Capacity is too large"),
  location: z.string().trim().max(100, "Use 100 characters or fewer"),
  isActive: z.boolean(),
});

export type TableFormInput = z.input<typeof tableSchema>;
export type TableFormValues = z.output<typeof tableSchema>;
