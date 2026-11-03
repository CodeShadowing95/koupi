import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
  /** Courte présentation affichée en haut de sa page publique, écrite par l'admin (puis par le créateur). */
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('creators_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('creators_name_len', sql`char_length(trim(${table.name})) between 1 and 160`),
  check('creators_bio_len', sql`${table.bio} is null or char_length(${table.bio}) between 1 and 400`),
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
  /** Date à laquelle l'admin a essayé le code au paiement (badge « Testé au paiement »), vide sinon. */
  paymentTestedAt: timestamp('payment_tested_at', { withTimezone: true }),
  /** Date de fin écrite par le créateur (« jusqu'au 31/12 »), vide si le code n'en a pas. */
  expiresOn: date('expires_on', { mode: 'string' }),
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

export const CODE_ACTIONS = ['create', 'edit', 'verify', 'reject', 'to_test', 'pending', 'archive', 'restore', 'payment_test'] as const;

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
  check('code_logs_action_valid', sql`${table.action} in ('create','edit','verify','reject','to_test','pending','archive','restore','payment_test')`),
]);

export const COUNTER_METRICS = ['copy', 'open', 'search_empty'] as const;

// Mesure d'audience anonyme : un simple total par jour, par mesure et par clé (id du code, ou recherche sans résultat).
// Ni cookie, ni IP, ni identifiant de visiteur : on ne peut pas suivre une personne, seulement compter.
export const dailyCounters = pgTable('daily_counters', {
  day: date('day').notNull(),
  metric: text('metric', { enum: COUNTER_METRICS }).notNull(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
}, table => [
  primaryKey({ columns: [table.day, table.metric, table.key] }),
  index('daily_counters_metric_day_idx').on(table.metric, table.day),
  check('daily_counters_metric_valid', sql`${table.metric} in ('copy','open','search_empty')`),
  check('daily_counters_key_len', sql`char_length(${table.key}) between 1 and 80`),
]);

export type VerificationReason = { points: number; label: string };

// Analyses d'un code ou d'une proposition (contrôles automatiques, puis lecture par l'IA quand elle est active).
// On garde chaque analyse : c'est la preuve montrée à l'admin et la base du calcul du budget IA du mois.
export const verificationChecks = pgTable('verification_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeId: uuid('code_id').references(() => codes.id),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  reasons: jsonb('reasons').$type<VerificationReason[]>().notNull().default([]),
  /** Extrait de la source où figure le code. */
  evidence: text('evidence'),
  /** Champs lus par l'IA (code, outil, réduction, conditions…), vide sans IA. */
  extracted: jsonb('extracted').$type<Record<string, unknown>>(),
  /** Modèle d'IA utilisé, vide sans IA. */
  model: text('model'),
  /** Coût de l'appel à l'IA en millionièmes de dollar, 0 sans IA. */
  costUsdMicros: integer('cost_usd_micros').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('verification_checks_code_idx').on(table.codeId, table.createdAt.desc()),
  index('verification_checks_submission_idx').on(table.submissionId, table.createdAt.desc()),
  index('verification_checks_created_idx').on(table.createdAt.desc()),
  check('verification_checks_target', sql`${table.codeId} is not null or ${table.submissionId} is not null`),
  check('verification_checks_score_range', sql`${table.score} between 0 and 100`),
  check('verification_checks_cost_positive', sql`${table.costUsdMicros} >= 0`),
]);

export const WATCHED_PLATFORMS = ['youtube', 'podcast'] as const;

// Chaînes YouTube et podcasts lus par les scripts de sourcing.
export const watchedSources = pgTable('watched_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: text('platform', { enum: WATCHED_PLATFORMS }).notNull(),
  /** Identifiant stable sur la plateforme (ID de chaîne YouTube, ID Apple Podcasts). */
  externalId: text('external_id').notNull(),
  feedUrl: text('feed_url'),
  title: text('title').notNull(),
  creatorId: uuid('creator_id').references(() => creators.id),
  active: boolean('active').notNull().default(true),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('watched_sources_platform_external_idx').on(table.platform, table.externalId),
  index('watched_sources_active_idx').on(table.active),
  check('watched_sources_platform_valid', sql`${table.platform} in ('youtube','podcast')`),
  check('watched_sources_external_id_len', sql`char_length(trim(${table.externalId})) between 1 and 200`),
  check('watched_sources_title_len', sql`char_length(trim(${table.title})) between 1 and 200`),
  check('watched_sources_feed_url_http', sql`${table.feedUrl} is null or ${table.feedUrl} ~* '^https?://'`),
]);

export const CREATOR_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'snapchat', 'twitch', 'x', 'podcast', 'other'] as const;
export const CLAIM_STATUSES = ['none', 'pending', 'verified', 'revoked'] as const;
export const CLAIM_METHODS = ['oauth', 'bio_code', 'dm', 'manual'] as const;

// Comptes d'un créateur sur les réseaux (voir ADR-0016). Un compte n'appartient qu'à un créateur.
// Le niveau du créateur (Repéré, Contrôlé par Koupi, Créateur vérifié) se déduit de ses comptes.
export const creatorAccounts = pgTable('creator_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: CREATOR_PLATFORMS }).notNull(),
  /** Identifiant stable sur le réseau (ID de chaîne YouTube…) : un pseudo peut changer, lui non. */
  externalId: text('external_id'),
  handle: text('handle').notNull(),
  url: text('url').notNull(),
  subscribers: integer('subscribers'),
  subscribersAt: timestamp('subscribers_at', { withTimezone: true }),
  /** Badge de compte certifié du réseau, coché à la main par l'admin (l'API YouTube ne le donne pas). */
  platformVerified: boolean('platform_verified').notNull().default(false),
  /** Date du contrôle par l'admin : compte réel, actif, pas une usurpation. */
  adminCheckedAt: timestamp('admin_checked_at', { withTimezone: true }),
  /** Réclamation par le créateur lui-même (espace créateur, plus tard). */
  claimStatus: text('claim_status', { enum: CLAIM_STATUSES }).notNull().default('none'),
  claimMethod: text('claim_method', { enum: CLAIM_METHODS }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  /** Code de preuve à placer dans la bio du compte (KOUPI-XXXXXX), tant que la preuve est en cours. Voir ADR-0020. */
  claimCode: text('claim_code'),
  claimCodeAt: timestamp('claim_code_at', { withTimezone: true }),
  lastRecheckedAt: timestamp('last_rechecked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('creator_accounts_creator_idx').on(table.creatorId),
  uniqueIndex('creator_accounts_platform_external_idx').on(table.platform, table.externalId),
  uniqueIndex('creator_accounts_platform_handle_idx').on(table.platform, sql`lower(${table.handle})`),
  check('creator_accounts_platform_valid', sql`${table.platform} in ('youtube','tiktok','instagram','snapchat','twitch','x','podcast','other')`),
  check('creator_accounts_claim_status_valid', sql`${table.claimStatus} in ('none','pending','verified','revoked')`),
  check('creator_accounts_claim_method_valid', sql`${table.claimMethod} is null or ${table.claimMethod} in ('oauth','bio_code','dm','manual')`),
  check('creator_accounts_handle_len', sql`char_length(trim(${table.handle})) between 1 and 120`),
  check('creator_accounts_external_id_len', sql`${table.externalId} is null or char_length(trim(${table.externalId})) between 1 and 200`),
  check('creator_accounts_url_http', sql`${table.url} ~* '^https?://'`),
  check('creator_accounts_subscribers_positive', sql`${table.subscribers} is null or ${table.subscribers} >= 0`),
  check('creator_accounts_claim_code_format', sql`${table.claimCode} is null or ${table.claimCode} ~ '^KOUPI-[A-Z0-9]{6}$'`),
  check('creator_accounts_claim_code_pending', sql`${table.claimCode} is null or (${table.claimStatus} = 'pending' and ${table.claimCodeAt} is not null)`),
]);

export type Submission = typeof submissions.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ToolRow = typeof tools.$inferSelect;
export type CreatorRow = typeof creators.$inferSelect;
export type CodeRow = typeof codes.$inferSelect;
export type VerificationCheckRow = typeof verificationChecks.$inferSelect;
export type WatchedSourceRow = typeof watchedSources.$inferSelect;
export type CreatorAccountRow = typeof creatorAccounts.$inferSelect;

export const CREATOR_REQUEST_KINDS = ['claim', 'report'] as const;
export const CREATOR_REQUEST_STATUSES = ['new', 'done', 'dismissed'] as const;

// Demandes envoyées depuis la page publique d'un créateur : « C'est ma page » (revendication) ou « Page incorrecte »
// (signalement). Avant l'espace créateur, l'admin les traite à la main et recontacte la personne par e-mail.
export const creatorRequests = pgTable('creator_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: CREATOR_REQUEST_KINDS }).notNull(),
  /** Obligatoire pour une revendication (on recontacte la personne), facultatif pour un signalement. */
  email: text('email'),
  /** Revendication : le compte que la personne dit être le sien. */
  accountUrl: text('account_url'),
  message: text('message'),
  status: text('status', { enum: CREATOR_REQUEST_STATUSES }).notNull().default('new'),
  adminNote: text('admin_note'),
  ipHash: text('ip_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  handledAt: timestamp('handled_at', { withTimezone: true }),
}, table => [
  index('creator_requests_status_created_idx').on(table.status, table.createdAt.desc()),
  index('creator_requests_creator_idx').on(table.creatorId),
  check('creator_requests_kind_valid', sql`${table.kind} in ('claim','report')`),
  check('creator_requests_status_valid', sql`${table.status} in ('new','done','dismissed')`),
  check('creator_requests_claim_contact', sql`${table.kind} <> 'claim' or (${table.email} is not null and ${table.accountUrl} is not null)`),
  check('creator_requests_report_message', sql`${table.kind} <> 'report' or ${table.message} is not null`),
  check('creator_requests_email_len', sql`${table.email} is null or char_length(${table.email}) between 3 and 320`),
  check('creator_requests_account_url_http', sql`${table.accountUrl} is null or ${table.accountUrl} ~* '^https?://'`),
  check('creator_requests_message_len', sql`${table.message} is null or char_length(${table.message}) between 1 and 1000`),
  check('creator_requests_admin_note_len', sql`${table.adminNote} is null or char_length(${table.adminNote}) <= 500`),
]);

export type CreatorRequestRow = typeof creatorRequests.$inferSelect;

// Comptes Koupi des créateurs (ADR-0021) : on se connecte par un lien reçu par e-mail, sans mot de passe.
// creatorId reste vide tant que l'admin n'a pas donné l'accès à une page (après la preuve par la bio).
export const creatorUsers = pgTable('creator_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'set null' }),
  accessGrantedAt: timestamp('access_granted_at', { withTimezone: true }),
  lastSignInAt: timestamp('last_sign_in_at', { withTimezone: true }),
  /** Compte désactivé par l'admin (espace Administration) : connexion refusée et session coupée tant qu'il l'est. */
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('creator_users_email_idx').on(table.email),
  index('creator_users_creator_idx').on(table.creatorId),
  check('creator_users_email_format', sql`${table.email} = lower(${table.email}) and char_length(${table.email}) between 3 and 320 and position('@' in ${table.email}) > 1`),
]);

// Liens de connexion envoyés par e-mail : seule l'empreinte SHA-256 du jeton est gardée, valable 20 minutes, une seule fois.
export const creatorSignInTokens = pgTable('creator_sign_in_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull(),
  /** Page revendiquée au moment de la demande, pour revenir dessus après la connexion. */
  creatorSlug: text('creator_slug'),
  ipHash: text('ip_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('creator_sign_in_tokens_hash_idx').on(table.tokenHash),
  index('creator_sign_in_tokens_email_idx').on(table.email),
  check('creator_sign_in_tokens_hash_len', sql`char_length(${table.tokenHash}) = 64`),
]);

export type CreatorUserRow = typeof creatorUsers.$inferSelect;

// Interrupteurs du site (ADR-0022) : une ligne par page publique désactivable (« page:<clé> ») et le mode maintenance
// (« maintenance »). Une clé absente garde sa valeur par défaut : page en ligne, maintenance coupée.
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('site_settings_key_format', sql`${table.key} ~ '^(maintenance|page:[a-z-]{2,40})$'`),
]);

// Journal de l'espace Administration : un geste de l'admin par ligne (page coupée, maintenance, compte créateur…).
// Ni IP ni navigateur. Les lignes de plus de 12 mois sont effacées par la tâche de nuit.
export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('admin_audit_log_created_idx').on(table.createdAt),
  check('admin_audit_log_action_len', sql`char_length(${table.action}) between 1 and 60`),
  check('admin_audit_log_target_len', sql`char_length(${table.target}) between 1 and 200`),
]);
