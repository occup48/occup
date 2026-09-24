import { sql } from "drizzle-orm";
import { check, pgTable, uuid, varchar, time, integer, timestamp } from "drizzle-orm/pg-core";

export const restaurantSettings = pgTable("restaurant_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 50 }).default("default").notNull().unique(),
    restaurantName: varchar("restaurant_name", { length: 100 }).notNull(),
    openingTime: time("opening_time").notNull(),
    closingTime: time("closing_time").notNull(),
    reservationDuration: integer("reservation_duration").default(90).notNull(),
    bookingInterval: integer("booking_interval").default(30).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
}, (table) => [
    check("restaurant_settings_reservation_duration_positive", sql`${table.reservationDuration} > 0`),
    check("restaurant_settings_booking_interval_positive", sql`${table.bookingInterval} > 0`),
]);
