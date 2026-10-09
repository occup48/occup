import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { restaurantSettings } from "../db/schema/restaurant-settings.js";
import type { UpdateSettingsInput } from "../validators/settings.validator.js";

export const getRestaurantSettings = async () => {
  const [settings] = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.key, "default"))
    .limit(1);

  if (!settings) {
    throw new Error("Restaurant settings have not been configured");
  }

  return settings;
};

export const updateRestaurantSettings = async (input: UpdateSettingsInput) => {
  const [currentSettings] = await db
    .select()
    .from(restaurantSettings)
    .where(eq(restaurantSettings.key, "default"))
    .limit(1);

  if (!currentSettings) {
    throw new Error("Restaurant settings have not been configured");
  }

  const [updatedSettings] = await db
    .update(restaurantSettings)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(restaurantSettings.key, "default"))
    .returning();

  if (!updatedSettings) {
    throw new Error("Failed to update restaurant settings");
  }

  return updatedSettings;
};
