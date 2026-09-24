ALTER TABLE "tables" ADD CONSTRAINT "tables_capacity_positive" CHECK ("tables"."capacity" > 0);--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_party_size_positive" CHECK ("reservations"."party_size" > 0);--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_end_after_start" CHECK ("reservations"."end_time" > "reservations"."start_time");--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD CONSTRAINT "restaurant_settings_reservation_duration_positive" CHECK ("restaurant_settings"."reservation_duration" > 0);--> statement-breakpoint
ALTER TABLE "restaurant_settings" ADD CONSTRAINT "restaurant_settings_booking_interval_positive" CHECK ("restaurant_settings"."booking_interval" > 0);--> statement-breakpoint
-- Keep this custom exclusion constraint: Drizzle cannot express it in its schema.
-- Half-open ranges allow one booking to start exactly when another ends.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
EXCLUDE USING gist (
    "table_id" WITH =,
    tsrange("reservation_date" + "start_time", "reservation_date" + "end_time", '[)') WITH &&
) WHERE ("status" <> 'cancelled');
