import type { Request, Response } from "express";

import {
  cancelUserReservation,
  getUserReservation,
  listUserReservations,
} from "../services/customer-reservations.service.js";
import { reservationIdParamsSchema } from "../validators/reservation-params.validator.js";

const signedInUserId = (res: Response): string | null => {
  const userId = res.locals.user?.userId;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
};

const unauthenticated = (res: Response) =>
  res.status(401).json({ success: false, message: "Authentication required" });

const invalidId = (res: Response) =>
  res.status(400).json({ success: false, message: "Invalid reservation id" });

const notFound = (res: Response) =>
  res.status(404).json({ success: false, message: "Reservation not found" });

export const getMyReservations = async (_req: Request, res: Response) => {
  const userId = signedInUserId(res);
  if (!userId) return unauthenticated(res);

  try {
    const reservations = await listUserReservations(userId);
    return res.status(200).json({
      success: true,
      message: "Reservations retrieved",
      data: { reservations },
    });
  } catch (error) {
    console.error("List reservations error:", error);
    return res.status(500).json({ success: false, message: "Unable to load reservations" });
  }
};

export const getMyReservation = async (req: Request, res: Response) => {
  const userId = signedInUserId(res);
  if (!userId) return unauthenticated(res);

  const params = reservationIdParamsSchema.safeParse(req.params);
  if (!params.success) return invalidId(res);

  try {
    // Someone else's reservation looks exactly like one that does not exist.
    const reservation = await getUserReservation(userId, params.data.id);
    if (!reservation) return notFound(res);

    return res.status(200).json({
      success: true,
      message: "Reservation retrieved",
      data: { reservation },
    });
  } catch (error) {
    console.error("Get reservation error:", error);
    return res.status(500).json({ success: false, message: "Unable to load reservation" });
  }
};

export const cancelMyReservation = async (req: Request, res: Response) => {
  const userId = signedInUserId(res);
  if (!userId) return unauthenticated(res);

  const params = reservationIdParamsSchema.safeParse(req.params);
  if (!params.success) return invalidId(res);

  try {
    const result = await cancelUserReservation(userId, params.data.id);

    if (result.ok) {
      return res.status(200).json({
        success: true,
        message: "Reservation cancelled",
        data: { reservation: result.reservation },
      });
    }

    if (result.reason === "NOT_FOUND") return notFound(res);

    if (result.reason === "ALREADY_CANCELLED") {
      return res.status(409).json({
        success: false,
        code: "ALREADY_CANCELLED",
        message: "This reservation has already been cancelled.",
      });
    }

    return res.status(409).json({
      success: false,
      code: "NOT_CANCELLABLE",
      message: "This reservation can no longer be cancelled.",
    });
  } catch (error) {
    console.error("Cancel reservation error:", error);
    return res.status(500).json({ success: false, message: "Unable to cancel reservation" });
  }
};
