import { z } from "zod";

export const reservationIdParamsSchema = z.object({
  id: z.string().uuid(),
});
