import type { Request, Response } from "express";

import { createReservationSchema } from "../validators/reservations.validator.js";
import { createReservation } from "../services/reservations.service.js";

export const postReservation = async (req: Request, res: Response) => {
  const result = createReservationSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid reservation data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  const userId = res.locals.user.userId;

  const { specialRequests, ...rest } = result.data;

  try {
    const reservation = await createReservation({
      ...rest,
      userId,
      ...(specialRequests !== undefined ? { specialRequests } : {}),
    });
    return res.status(201).json({
      success: true,
      message: "Reservation confirmed",
      data: { reservation },
    });
  } catch (error: any) {
    if (error.code === "TABLE_UNAVAILABLE") {
      return res.status(409).json({
        success: false,
        message: "That table is no longer available for the selected time.",
      });
    }
    if (error.code === "INVALID_TIME_RANGE" || error.code === "OUTSIDE_OPERATING_HOURS") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Reservation error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create reservation",
    });
  }
};