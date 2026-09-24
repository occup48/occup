-- Run after all migrations against a disposable PostgreSQL database:
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/reservation-invariants.sql
BEGIN;
CREATE FUNCTION pg_temp.expect_constraint(statement text, expected_name text, expected_state text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_name text; actual_state text;
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS actual_name = CONSTRAINT_NAME, actual_state = RETURNED_SQLSTATE;
        IF actual_name = expected_name AND actual_state = expected_state THEN
            RETURN;
        END IF;
        RAISE;
    END;
    RAISE EXCEPTION 'Expected constraint % for: %', expected_name, statement;
END;
$$;

INSERT INTO tables (id, table_number, capacity) VALUES
('00000000-0000-0000-0000-000000000001', 'test-1', 4),
('00000000-0000-0000-0000-000000000002', 'test-2', 4);

CREATE FUNCTION pg_temp.book(start_at text, end_at text, booking_status text DEFAULT 'confirmed',
    booking_date text DEFAULT '2030-01-01', table_uuid text DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS void LANGUAGE sql AS $$
    INSERT INTO reservations (table_id, reservation_date, start_time, end_time, party_size, status)
    VALUES (table_uuid::uuid, booking_date::date, start_at::time, end_at::time, 2, booking_status::reservation_status);
$$;
SELECT pg_temp.book('12:00', '13:00');
-- Exact, partial and enclosing overlaps must all fail.
SELECT pg_temp.expect_constraint(format('SELECT pg_temp.book(%L, %L)', starts, ends),
    'reservations_no_overlap', '23P01')
FROM (VALUES ('12:00', '13:00'), ('11:30', '12:30'), ('12:30', '13:30'),
    ('11:00', '14:00'), ('12:15', '12:45')) AS intervals(starts, ends);
-- Adjacent ranges, different dates/tables and cancelled bookings are allowed.
SELECT pg_temp.book('11:00', '12:00');
SELECT pg_temp.book('13:00', '14:00');
SELECT pg_temp.book('12:00', '13:00', 'confirmed', '2030-01-02');
SELECT pg_temp.book('12:00', '13:00', 'confirmed', '2030-01-01', '00000000-0000-0000-0000-000000000002');
SELECT pg_temp.book('12:00', '13:00', 'cancelled');
SELECT pg_temp.expect_constraint(
    $q$UPDATE reservations SET status = 'confirmed' WHERE status = 'cancelled'$q$,
    'reservations_no_overlap', '23P01');
SELECT pg_temp.expect_constraint(
    $q$UPDATE reservations SET start_time = '12:30' WHERE start_time = '13:00'$q$,
    'reservations_no_overlap', '23P01');
-- Completed bookings retain their occupied interval.
UPDATE reservations SET status = 'completed' WHERE status = 'confirmed';
SELECT pg_temp.expect_constraint($q$SELECT pg_temp.book('12:00', '13:00')$q$,
    'reservations_no_overlap', '23P01');
-- Cancellation releases the table.
UPDATE reservations SET status = 'cancelled';
SELECT pg_temp.book('12:00', '13:00');

SELECT pg_temp.expect_constraint(format('UPDATE reservations SET party_size = %s', value),
    'reservations_party_size_positive', '23514') FROM (VALUES (0), (-1)) AS invalid(value);
SELECT pg_temp.expect_constraint(format('UPDATE tables SET capacity = %s', value),
    'tables_capacity_positive', '23514') FROM (VALUES (0), (-1)) AS invalid(value);
SELECT pg_temp.expect_constraint($q$SELECT pg_temp.book('15:00', '15:00')$q$,
    'reservations_end_after_start', '23514');
SELECT pg_temp.expect_constraint($q$SELECT pg_temp.book('16:00', '15:00')$q$,
    'reservations_end_after_start', '23514');
INSERT INTO restaurant_settings (restaurant_name, opening_time, closing_time)
VALUES ('Test', '09:00', '22:00');
SELECT pg_temp.expect_constraint(format('UPDATE restaurant_settings SET reservation_duration = %s', value),
    'restaurant_settings_reservation_duration_positive', '23514') FROM (VALUES (0), (-1)) AS invalid(value);
SELECT pg_temp.expect_constraint(format('UPDATE restaurant_settings SET booking_interval = %s', value),
    'restaurant_settings_booking_interval_positive', '23514') FROM (VALUES (0), (-1)) AS invalid(value);
-- Small positive values remain valid.
UPDATE tables SET capacity = 1;
UPDATE reservations SET party_size = 1;
UPDATE restaurant_settings SET reservation_duration = 1, booking_interval = 1;
ROLLBACK;
