import { pgTable, uuid, integer, date, time, timestamp, pgEnum, text } from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { tables } from "./tables.js";

export const reservationStatusEnum = pgEnum("reservation_status", ["confirmed", "cancelled", "completed"]);

export const reservations = pgTable("reservations", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    tableId: uuid("table_id").references(() => tables.id),
    reservationDate: date("reservation_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    partySize: integer("party_size").notNull(),
    status: reservationStatusEnum("status").default("confirmed").notNull(),
    specialRequests: text("special_requests"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
});