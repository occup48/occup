import { z } from "zod";
import { AdminApiError, requestAdminApi, type AdminApiMethod } from "../admin-api.service";
import type { RestaurantSettings, SettingsUpdate } from "./settings.types";

const databaseTimeSchema = z.string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/, "The server returned an invalid restaurant time.")
  .transform((value) => value.slice(0, 5));

const restaurantSettingsSchema = z.object({
  id: z.string(),
  key: z.string(),
  restaurantName: z.string(),
  openingTime: databaseTimeSchema,
  closingTime: databaseTimeSchema,
  reservationDuration: z.number().int(),
  bookingInterval: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function failureMessage(status: number, method: AdminApiMethod): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You no longer have access to manage restaurant settings.";
  if (status === 404) return "Restaurant settings could not be found.";
  if (status === 400) return "Please check the settings and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  return method === "GET"
    ? "We couldn’t load restaurant settings. Please try again."
    : "We couldn’t save your changes. Please try again.";
}

export function getRestaurantSettings(token: string, signal?: AbortSignal): Promise<RestaurantSettings> {
  return requestAdminApi({
    token,
    path: "/api/admin/settings",
    method: "GET",
    responseSchema: restaurantSettingsSchema,
    signal,
    unavailableMessage: "Restaurant settings are temporarily unavailable. Please try again later.",
    failureMessage,
    responseErrorMessage: "We received an unexpected restaurant settings response. Please refresh the page.",
  });
}

export function updateRestaurantSettings(
  token: string,
  payload: SettingsUpdate,
  signal?: AbortSignal,
): Promise<RestaurantSettings> {
  if (Object.keys(payload).length === 0) {
    throw new AdminApiError("Make a change before saving.");
  }
  return requestAdminApi({
    token,
    path: "/api/admin/settings",
    method: "PATCH",
    responseSchema: restaurantSettingsSchema,
    payload,
    signal,
    unavailableMessage: "Restaurant settings are temporarily unavailable. Please try again later.",
    failureMessage,
    responseErrorMessage: "We received an unexpected save response. Please refresh the page.",
  });
}

export function getSettingsError(error: unknown): string {
  return error instanceof AdminApiError
    ? error.message
    : "Something went wrong. Please try again.";
}
