import { pgTable, uuid, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const tables = pgTable("tables", {
    id: uuid("id").defaultRandom().primaryKey(),
    tableNumber: varchar("table_number", { length: 10 }).notNull().unique(),
    capacity: integer("capacity").notNull(),
    location: varchar("location", { length: 100 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
});