import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(),
  name: text('name').notNull(), role: text('role').notNull(),
  passwordHash: text('password_hash'), salt: text('salt'), phone: text('phone').notNull().default(''),
  city: text('city').notNull().default('Ташкент'), bio: text('bio').notNull().default(''),
  createdAt: text('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(), userId: text('user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
});
export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull().references(() => users.id),
  kind: text('kind').notNull(), title: text('title').notNull(), subject: text('subject').notNull(),
  language: text('language').notNull(), city: text('city').notNull(), format: text('format').notNull(),
  price: integer('price').notNull(), duration: integer('duration').notNull().default(60),
  description: text('description').notNull(), level: text('level').notNull().default('Все уровни'),
  experience: integer('experience').notNull().default(0), active: integer('active').notNull().default(1),
  createdAt: text('created_at').notNull(),
}, t => [index('listing_owner').on(t.ownerId)]);
export const slots = sqliteTable('slots', {
  id: text('id').primaryKey(), listingId: text('listing_id').notNull().references(() => listings.id),
  startsAt: text('starts_at').notNull(), endsAt: text('ends_at').notNull(), capacity: integer('capacity').notNull().default(1),
}, t => [uniqueIndex('unique_listing_slot').on(t.listingId, t.startsAt)]);
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(), slotId: text('slot_id').notNull().references(() => slots.id),
  studentId: text('student_id').notNull().references(() => users.id),
  status: text('status').notNull().default('confirmed'), meetingUrl: text('meeting_url').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('one_active_booking_per_student_slot').on(t.slotId,t.studentId).where(sql`${t.status} <> 'cancelled'`)]);
export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(), bookingId: text('booking_id').notNull().references(() => bookings.id),
  title: text('title').notNull(), body: text('body').notNull(), dueAt: text('due_at').notNull(),
  createdAt: text('created_at').notNull(),
});
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), assignmentId: text('assignment_id').notNull().unique().references(() => assignments.id),
  studentId: text('student_id').notNull().references(() => users.id), body: text('body').notNull(),
  fileKey: text('file_key'), fileName: text('file_name'), grade: integer('grade'), feedback: text('feedback'),
  submittedAt: text('submitted_at').notNull(),
});
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), senderId: text('sender_id').notNull().references(() => users.id),
  recipientId: text('recipient_id').notNull().references(() => users.id), body: text('body').notNull(),
  readAt: text('read_at'), createdAt: text('created_at').notNull(),
}, t => [index('message_recipient').on(t.recipientId, t.createdAt)]);
export const favorites = sqliteTable('favorites', {
  userId: text('user_id').notNull().references(() => users.id), listingId: text('listing_id').notNull(),
}, t => [uniqueIndex('favorite_unique').on(t.userId, t.listingId)]);
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(), listingId: text('listing_id').notNull().references(() => listings.id),
  studentId: text('student_id').notNull().references(() => users.id), rating: integer('rating').notNull(),
  body: text('body').notNull(), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('review_once').on(t.listingId, t.studentId)]);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), resetAt: integer('reset_at').notNull(),
});
