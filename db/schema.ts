import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Propositions de codes envoyées par le public, en attente de modération.
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolName: text('tool_name').notNull(),
  creatorName: text('creator_name').notNull(),
  category: text('category'),
  code: text('code').notNull(),
  discountLabel: text('discount_label').notNull(),
  sourceUrl: text('source_url').notNull(),
  creatorLink: text('creator_link'),
  comment: text('comment'),
  submitterEmail: text('submitter_email'),
  ipHash: text('ip_hash').notNull(),
  fingerprint: text('fingerprint').notNull(),
  status: text('status', { enum: ['new', 'approved', 'rejected', 'duplicate'] }).notNull().default('new'),
  adminNote: text('admin_note'),
  createdCodeId: uuid('created_code_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
}, table => [
  index('submissions_status_created_idx').on(table.status, table.createdAt.desc()),
  index('submissions_fingerprint_idx').on(table.fingerprint),
  index('submissions_category_idx').on(table.category),
  check('submissions_tool_name_len', sql`char_length(trim(${table.toolName})) between 1 and 120`),
  check('submissions_creator_name_len', sql`char_length(trim(${table.creatorName})) between 1 and 160`),
  check('submissions_code_len', sql`char_length(trim(${table.code})) between 1 and 120`),
  check('submissions_discount_label_len', sql`char_length(trim(${table.discountLabel})) between 1 and 240`),
  check('submissions_source_url_http', sql`${table.sourceUrl} ~* '^https?://'`),
  check('submissions_status_valid', sql`${table.status} in ('new','approved','rejected','duplicate')`),
]);

// Journal des décisions de modération (on n'y supprime rien).
export const moderationLogs = pgTable('moderation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'set null' }),
  action: text('action', { enum: ['approve', 'reject', 'mark_duplicate', 'restore'] }).notNull(),
  previousStatus: text('previous_status'),
  nextStatus: text('next_status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('moderation_logs_created_idx').on(table.createdAt.desc()),
  check('moderation_logs_action_valid', sql`${table.action} in ('approve','reject','mark_duplicate','restore')`),
]);

export type Submission = typeof submissions.$inferSelect;
