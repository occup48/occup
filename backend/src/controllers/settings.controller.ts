import type { Request, Response, NextFunction } from "express";
import {
  getRestaurantSettings,
  updateRestaurantSettings,
} from "../services/settings.service.js";
import { updateSettingsSchema } from "../validators/settings.validator.js";

export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const settings = await getRestaurantSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = updateSettingsSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    const settings = await updateRestaurantSettings(result.data);

    res.status(200).json({
      success: true,
      message: "Restaurant settings updated successfully",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
