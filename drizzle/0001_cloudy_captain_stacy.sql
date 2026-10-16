DROP INDEX `one_active_booking_per_slot`;--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_booking_per_student_slot` ON `bookings` (`slot_id`,`student_id`) WHERE "bookings"."status" <> 'cancelled';--> statement-breakpoint
ALTER TABLE `slots` ADD `capacity` integer DEFAULT 1 NOT NULL;