import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "./index.js";
import { tables, restaurantSettings } from "./schema/index.js";

async function seed() {
  console.log("Seeding database...");

  // Restaurant configuration
  await db
    .insert(restaurantSettings)
    .values({
      key: "default",
      restaurantName: "Occup Restaurant",
      openingTime: "09:00:00",
      closingTime: "22:00:00",
      reservationDuration: 90,
      bookingInterval: 30,
    })
    .onConflictDoNothing();

  // Restaurant tables
  await db
    .insert(tables)
    .values([
      {
        tableNumber: "T01",
        capacity: 2,
        location: "Window",
      },
      {
        tableNumber: "T02",
        capacity: 2,
        location: "Indoor",
      },
      {
        tableNumber: "T03",
        capacity: 4,
        location: "Window",
      },
      {
        tableNumber: "T04",
        capacity: 4,
        location: "Indoor",
      },
      {
        tableNumber: "T05",
        capacity: 6,
        location: "Indoor",
      },
      {
        tableNumber: "T06",
        capacity: 8,
        location: "Private",
      },
    ])
    .onConflictDoNothing();

  const restaurant = await db.select().from(restaurantSettings);
  const restaurantTables = await db.select().from(tables);

  console.log("Restaurant settings:", restaurant);
  console.log("Restaurant tables:", restaurantTables);

  console.log("Database seeded successfully.");
}

seed().catch((error) => {
  console.error("Database seeding failed:", error);
  process.exit(1);
});
