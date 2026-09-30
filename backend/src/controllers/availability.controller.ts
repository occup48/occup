import type { Request, Response } from "express";

import { availabilityQuerySchema } from "../validators/availability.validator.js";
import { getAvailableTables } from "../services/availability.service.js";

export const getAvailability = async (req: Request, res: Response) => {
  const result = availabilityQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const availableTables = await getAvailableTables(result.data);
    return res.status(200).json({
      success: true,
      message: "Availability retrieved",
      data: { tables: availableTables },
    });
  } catch (error) {
    console.error("Availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch availability",
    });
  }
};