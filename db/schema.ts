import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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

// Compteurs pour limiter les essais (connexion admin, propositions). La clé contient un hash d'IP, jamais l'IP.
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('rate_limits_window_start_idx').on(table.windowStart),
]);

// Catégories d'outils (Hébergement web, VPN et sécurité…).
export const categories = pgTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('categories_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('categories_name_len', sql`char_length(trim(${table.name})) between 1 and 80`),
]);

// Outils suivis. Le site ne montre que ceux qui ont au moins un code public.
export const tools = pgTable('tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  categorySlug: text('category_slug').notNull().references(() => categories.slug, { onUpdate: 'cascade' }),
  website: text('website').notNull(),
  description: text('description'),
  priority: integer('priority').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, table => [
  uniqueIndex('tools_name_lower_idx').on(sql`lower(${table.name})`),
  index('tools_category_idx').on(table.categorySlug),
  check('tools_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('tools_name_len', sql`char_length(trim(${table.name})) between 1 and 120`),
  check('tools_website_http', sql`${table.website} ~* '^https?://'`),
  check('tools_priority_range', sql`${table.priority} between 1 and 5`),
]);

// Créateurs (YouTube, TikTok, Instagram…). Leurs comptes sur chaque réseau et leur vérification
// viendront dans une table à part, reliée à creators.id : le reste du modèle n'aura pas à changer.
export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('creators_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('creators_name_len', sql`char_length(trim(${table.name})) between 1 and 160`),
]);

export const CODE_STATUSES = ['pending', 'to_test', 'verified', 'rejected'] as const;

// Codes promo. On n'efface jamais un code : on l'archive (archived_at), pour garder l'historique
// et pour que l'import des fichiers de data/ ne le recrée pas.
export const codes = pgTable('codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identifiant du code dans les fichiers de data/ (import initial), vide pour les codes créés dans l'admin. */
  importKey: text('import_key').unique(),
  toolId: uuid('tool_id').notNull().references(() => tools.id),
  code: text('code').notNull(),
  discount: text('discount').notNull(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id),
  /** Lien d'affiliation du créateur pour ce code, ouvert tel quel. */
  creatorLink: text('creator_link'),
  sourceUrl: text('source_url').notNull(),
  sourceTitle: text('source_title').notNull().default(''),
  status: text('status', { enum: CODE_STATUSES }).notNull().default('pending'),
  note: text('note'),
  votesUp: integer('votes_up').notNull().default(0),
  votesDown: integer('votes_down').notNull().default(0),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'set null' }),
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, table => [
  index('codes_tool_idx').on(table.toolId),
  index('codes_creator_idx').on(table.creatorId),
  index('codes_status_idx').on(table.status),
  check('codes_code_len', sql`char_length(trim(${table.code})) between 1 and 120`),
  check('codes_discount_len', sql`char_length(trim(${table.discount})) between 1 and 240`),
  check('codes_source_url_http', sql`${table.sourceUrl} ~* '^https?://'`),
  check('codes_creator_link_http', sql`${table.creatorLink} is null or ${table.creatorLink} ~* '^https?://'`),
  check('codes_status_valid', sql`${table.status} in ('pending','to_test','verified','rejected')`),
  check('codes_votes_positive', sql`${table.votesUp} >= 0 and ${table.votesDown} >= 0`),
]);

export const CODE_ACTIONS = ['create', 'edit', 'verify', 'reject', 'to_test', 'pending', 'archive', 'restore'] as const;

// Journal des actions de l'admin sur les codes (on n'y supprime rien).
export const codeLogs = pgTable('code_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeId: uuid('code_id').notNull().references(() => codes.id),
  action: text('action', { enum: CODE_ACTIONS }).notNull(),
  previousStatus: text('previous_status'),
  nextStatus: text('next_status').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('code_logs_code_idx').on(table.codeId, table.createdAt.desc()),
  index('code_logs_created_idx').on(table.createdAt.desc()),
  check('code_logs_action_valid', sql`${table.action} in ('create','edit','verify','reject','to_test','pending','archive','restore')`),
]);

export type Submission = typeof submissions.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ToolRow = typeof tools.$inferSelect;
export type CreatorRow = typeof creators.$inferSelect;
export type CodeRow = typeof codes.$inferSelect;
