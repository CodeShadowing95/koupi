import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { ToolAnalysis } from '../lib/tool-analysis';
import type { AccountMetrics } from '../lib/account-metrics';
import { CODE_ORIGINS } from '../lib/code-origin';

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

// Univers (ADR-0046) : le niveau au-dessus des familles. « Outils en ligne » est la promesse du site ;
// les autres (Beauté et soins, Mode…) sont collectés dans l'admin et restent cachés tant que visible est faux.
export const universes = pgTable('universes', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull().unique(),
  position: integer('position').notNull().default(0),
  /** Montré sur le site public. Faux par défaut : un nouvel univers reste dans l'admin. */
  visible: boolean('visible').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('universes_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('universes_name_len', sql`char_length(trim(${table.name})) between 1 and 60`),
]);

// Catégories d'outils (Hébergement web, VPN et sécurité…).
// Familles de catégories (ADR-0026) : le niveau au-dessus des catégories, qui sert de menu (Sécurité, Vidéo…).
export const categoryFamilies = pgTable('category_families', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull().unique(),
  position: integer('position').notNull().default(0),
  /** Univers de la famille ; ses catégories et ses outils en héritent. */
  universeSlug: text('universe_slug').notNull().default('outils-en-ligne').references(() => universes.slug, { onUpdate: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('category_families_slug_format', sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('category_families_name_len', sql`char_length(trim(${table.name})) between 1 and 80`),
]);

export const categories = pgTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull().unique(),
  /** Famille de la catégorie. Vide tant qu'elle n'est pas rangée. */
  familySlug: text('family_slug').references(() => categoryFamilies.slug, { onDelete: 'set null', onUpdate: 'cascade' }),
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
  /** Le code à taper, vide pour une offre donnée seulement par un lien (creator_link obligatoire alors, ADR-0040). */
  code: text('code'),
  discount: text('discount').notNull(),
  creatorId: uuid('creator_id').notNull().references(() => creators.id),
  /** Lien de l'offre (affiliation) du créateur, ouvert tel quel. Seul moyen d'en profiter quand il n'y a pas de code. */
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
  /** Comment Merkod a trouvé le code (lib/code-origin.ts, ADR-0032) : à la main, proposition, recherche YouTube, podcast… */
  origin: text('origin', { enum: CODE_ORIGINS }).notNull().default('unknown'),
}, table => [
  index('codes_tool_idx').on(table.toolId),
  index('codes_creator_idx').on(table.creatorId),
  index('codes_status_idx').on(table.status),
  check('codes_code_len', sql`${table.code} is null or char_length(trim(${table.code})) between 1 and 120`),
  check('codes_code_or_link', sql`${table.code} is not null or ${table.creatorLink} is not null`),
  check('codes_discount_len', sql`char_length(trim(${table.discount})) between 1 and 240`),
  check('codes_source_url_http', sql`${table.sourceUrl} ~* '^https?://'`),
  check('codes_creator_link_http', sql`${table.creatorLink} is null or ${table.creatorLink} ~* '^https?://'`),
  check('codes_status_valid', sql`${table.status} in ('pending','to_test','verified','rejected')`),
  check('codes_votes_positive', sql`${table.votesUp} >= 0 and ${table.votesDown} >= 0`),
  check('codes_origin_valid', sql`${table.origin} in ('manual','submission','import','youtube_search','youtube_channel','podcast','ai_web','spotify','creator','unknown')`),
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

// Vitesse ressentie par les visiteurs (Web Vitals), mesurée par leur navigateur (ADR-0038).
// Comme daily_counters : un total par jour, sans IP, cookie ni identifiant. Une ligne par jour, page, mesure, appareil et verdict.
export const VITAL_METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export const VITAL_PAGES = ['home', 'codes', 'tool', 'creator', 'creators', 'category', 'other'] as const;
export const VITAL_DEVICES = ['mobile', 'desktop'] as const;
export const VITAL_RATINGS = ['good', 'needs-improvement', 'poor'] as const;

export const webVitals = pgTable('web_vitals', {
  day: date('day').notNull(),
  page: text('page', { enum: VITAL_PAGES }).notNull(),
  metric: text('metric', { enum: VITAL_METRICS }).notNull(),
  device: text('device', { enum: VITAL_DEVICES }).notNull(),
  rating: text('rating', { enum: VITAL_RATINGS }).notNull(),
  count: integer('count').notNull().default(0),
}, table => [
  primaryKey({ columns: [table.day, table.page, table.metric, table.device, table.rating] }),
  check('web_vitals_page_valid', sql`${table.page} in ('home','codes','tool','creator','creators','category','other')`),
  check('web_vitals_metric_valid', sql`${table.metric} in ('LCP','INP','CLS','FCP','TTFB')`),
  check('web_vitals_device_valid', sql`${table.device} in ('mobile','desktop')`),
  check('web_vitals_rating_valid', sql`${table.rating} in ('good','needs-improvement','poor')`),
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
// Le niveau du créateur (Repéré, Contrôlé par Merkod, Créateur vérifié) se déduit de ses comptes.
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
  /** Autres mesures d'audience lues sur la source : note et nombre de notes, épisodes, vues… (lib/account-metrics.ts, ADR-0030). */
  metrics: jsonb('metrics').$type<AccountMetrics>().notNull().default({}),
  metricsAt: timestamp('metrics_at', { withTimezone: true }),
  /** Badge de compte certifié du réseau, coché à la main par l'admin (l'API YouTube ne le donne pas). */
  platformVerified: boolean('platform_verified').notNull().default(false),
  /** Date du contrôle par l'admin : compte réel, actif, pas une usurpation. */
  adminCheckedAt: timestamp('admin_checked_at', { withTimezone: true }),
  /** Réclamation par le créateur lui-même (espace créateur, plus tard). */
  claimStatus: text('claim_status', { enum: CLAIM_STATUSES }).notNull().default('none'),
  claimMethod: text('claim_method', { enum: CLAIM_METHODS }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  /** Code de preuve à placer dans la bio du compte (MERKOD-XXXXXX, ou KOUPI-XXXXXX pour les codes donnés avant le changement de nom), tant que la preuve est en cours. Voir ADR-0020. */
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
  check('creator_accounts_metrics_object', sql`jsonb_typeof(${table.metrics}) = 'object'`),
  check('creator_accounts_subscribers_positive', sql`${table.subscribers} is null or ${table.subscribers} >= 0`),
  check('creator_accounts_claim_code_format', sql`${table.claimCode} is null or ${table.claimCode} ~ '^(MERKOD|KOUPI)-[A-Z0-9]{6}$'`),
  check('creator_accounts_claim_code_pending', sql`${table.claimCode} is null or (${table.claimStatus} = 'pending' and ${table.claimCodeAt} is not null)`),
]);

export const TOOL_SUGGESTION_STATUSES = ['open', 'added', 'ignored'] as const;

// Codes repérés dans un podcast pour un outil absent du catalogue (voir ADR-0018). L'admin ajoute l'outil
// (le code part alors en vérification) ou ignore la suggestion. Rien n'est visible sur le site.
export const toolSuggestions = pgTable('tool_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Nom deviné de l'outil (domaine du lien ou mot avant « : »). */
  name: text('name').notNull(),
  /** Domaine trouvé à côté du code (gradium.ai), en minuscules. */
  domain: text('domain'),
  /** Vide pour une offre donnée seulement par un lien (link obligatoire alors, ADR-0040). */
  code: text('code'),
  /** Lien de l'offre (affiliation) écrit dans la source, vide s'il n'y en a pas. */
  link: text('link'),
  discount: text('discount').notNull(),
  evidence: text('evidence').notNull().default(''),
  sourceUrl: text('source_url').notNull(),
  sourceTitle: text('source_title').notNull().default(''),
  podcastId: uuid('podcast_id').references(() => watchedSources.id, { onDelete: 'set null' }),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'set null' }),
  status: text('status', { enum: TOOL_SUGGESTION_STATUSES }).notNull().default('open'),
  toolId: uuid('tool_id').references(() => tools.id),
  codeId: uuid('code_id').references(() => codes.id),
  /** Dernière analyse du site par l'IA (ADR-0024) : résumé, catégorie proposée. Null tant qu'il n'y en a pas. */
  analysis: jsonb('analysis').$type<ToolAnalysis>(),
  /** Coût cumulé des analyses par l'IA, en millionièmes de dollar, compté dans le plafond du mois. */
  analysisCostUsdMicros: integer('analysis_cost_usd_micros').notNull().default(0),
  analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, table => [
  uniqueIndex('tool_suggestions_tool_code_idx').on(sql`lower(coalesce(${table.domain}, ${table.name}))`, sql`lower(coalesce(${table.code}, ${table.link}))`),
  index('tool_suggestions_status_idx').on(table.status),
  check('tool_suggestions_name_len', sql`char_length(trim(${table.name})) between 1 and 120`),
  check('tool_suggestions_code_len', sql`${table.code} is null or char_length(trim(${table.code})) between 1 and 120`),
  check('tool_suggestions_code_or_link', sql`${table.code} is not null or ${table.link} is not null`),
  check('tool_suggestions_link_http', sql`${table.link} is null or ${table.link} ~* '^https?://'`),
  check('tool_suggestions_discount_len', sql`char_length(trim(${table.discount})) between 1 and 240`),
  check('tool_suggestions_domain_format', sql`${table.domain} is null or ${table.domain} ~ '^[a-z0-9-]+(\\.[a-z0-9-]+)+$'`),
  check('tool_suggestions_source_http', sql`${table.sourceUrl} ~* '^https?://'`),
]);

// Appels à l'IA qui ne sont rattachés à aucun code (lecture des notes d'épisode, ADR-0025) : leur coût compte
// dans le plafond du mois, comme celui des vérifications et des analyses d'outils.
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** À quoi a servi l'appel : 'podcast_notes'. */
  purpose: text('purpose').notNull(),
  model: text('model').notNull(),
  costUsdMicros: integer('cost_usd_micros').notNull().default(0),
  /** Ce qui a été lu (adresse de l'épisode). */
  ref: text('ref').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('ai_usage_created_idx').on(table.createdAt.desc()),
  check('ai_usage_cost_positive', sql`${table.costUsdMicros} >= 0`),
  check('ai_usage_purpose_len', sql`char_length(${table.purpose}) between 1 and 40`),
]);

// Consommation des API externes (YouTube, plus tard Spotify…), comptée par Merkod lui-même : YouTube ne donne pas
// le quota utilisé. Une ligne par service et par jour de quota du service (minuit heure du Pacifique pour YouTube).
export const apiUsage = pgTable('api_usage', {
  /** Service appelé : 'youtube'. */
  service: text('service').notNull(),
  /** Jour de quota du service. */
  day: date('day').notNull(),
  /** Unités consommées (YouTube : 1 par lecture, 100 par recherche). */
  units: integer('units').notNull().default(0),
  calls: integer('calls').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.service, table.day] }),
  check('api_usage_service_format', sql`${table.service} ~ '^[a-z0-9_]{1,30}$'`),
  check('api_usage_counts_positive', sql`${table.units} >= 0 and ${table.calls} >= 0`),
]);

// Recherche de codes sur YouTube (ADR-0033) : chaque recherche lancée, avec sa formulation, pour un outil ou pour le nom d'une catégorie.
// Elle sert à faire tourner les formulations et à ne demander que les vidéos publiées depuis la dernière recherche identique.
export const youtubeSearches = pgTable('youtube_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }),
  categorySlug: text('category_slug').references(() => categories.slug, { onDelete: 'cascade', onUpdate: 'cascade' }),
  /** Formulation utilisée (« code promo », « promo code »…), voir lib/youtube-queries.ts. */
  variant: text('variant').notNull(),
  query: text('query').notNull(),
  /** Vidéos rendues par YouTube, dont celles jamais lues avant. */
  videos: integer('videos').notNull().default(0),
  newVideos: integer('new_videos').notNull().default(0),
  codes: integer('codes').notNull().default(0),
  searchedAt: timestamp('searched_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('youtube_searches_tool_idx').on(table.toolId, table.searchedAt),
  index('youtube_searches_category_idx').on(table.categorySlug, table.searchedAt),
  check('youtube_searches_subject', sql`${table.toolId} is not null or ${table.categorySlug} is not null`),
  check('youtube_searches_variant_len', sql`char_length(${table.variant}) between 1 and 40`),
  check('youtube_searches_counts_positive', sql`${table.videos} >= 0 and ${table.newVideos} >= 0 and ${table.codes} >= 0`),
]);

// Vidéos YouTube déjà lues par la recherche de codes : une vidéo lue n'est plus relue (ni payée), et sa chaîne devient « connue ».
export const youtubeSeenVideos = pgTable('youtube_seen_videos', {
  videoId: text('video_id').primaryKey(),
  channelId: text('channel_id'),
  channelTitle: text('channel_title').notNull().default(''),
  /** Outil cherché quand la vidéo a été lue (vide pour la recherche sur le nom d'une catégorie). */
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'set null' }),
  query: text('query').notNull(),
  /** Codes mis en attente depuis cette vidéo. */
  codes: integer('codes').notNull().default(0),
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('youtube_seen_videos_channel_idx').on(table.channelId),
  check('youtube_seen_videos_id_format', sql`${table.videoId} ~ '^[A-Za-z0-9_-]{1,20}$'`),
  check('youtube_seen_videos_codes_positive', sql`${table.codes} >= 0`),
]);

export const SOURCE_RUN_SOURCES = ['youtube_search', 'youtube_channel', 'podcast'] as const;
export const SOURCE_RUN_TRIGGERS = ['manual', 'cron'] as const;
export const SOURCE_RUN_STATUSES = ['ok', 'partial', 'failed'] as const;

// Journal des passages des sources de codes (ADR-0035) : chaque recherche YouTube, lecture des chaînes suivies
// ou des podcasts, lancée à la main ou par la tâche de nuit, avec ce qu'elle a lu, trouvé et coûté.
export const sourceRuns = pgTable('source_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: text('source', { enum: SOURCE_RUN_SOURCES }).notNull(),
  trigger: text('trigger', { enum: SOURCE_RUN_TRIGGERS }).notNull(),
  /** Ce qui a été lu : « Catégories vides », « Catégorie VPN », « Outil NordVPN », « Toutes les chaînes »… */
  scope: text('scope').notNull().default(''),
  status: text('status', { enum: SOURCE_RUN_STATUSES }).notNull(),
  /** Vidéos ou épisodes lus. */
  items: integer('items').notNull().default(0),
  codes: integer('codes').notNull().default(0),
  /** Codes d'outils absents du catalogue, gardés en suggestion. */
  suggested: integer('suggested').notNull().default(0),
  /** Unités du quota YouTube (environ). */
  units: integer('units').notNull().default(0),
  /** Message d'erreur, ou ce qui n'a pas répondu. */
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('source_runs_source_idx').on(table.source, table.startedAt.desc()),
  index('source_runs_started_idx').on(table.startedAt.desc()),
  check('source_runs_source_valid', sql`${table.source} in ('youtube_search','youtube_channel','podcast')`),
  check('source_runs_trigger_valid', sql`${table.trigger} in ('manual','cron')`),
  check('source_runs_status_valid', sql`${table.status} in ('ok','partial','failed')`),
  check('source_runs_counts_positive', sql`${table.items} >= 0 and ${table.codes} >= 0 and ${table.suggested} >= 0 and ${table.units} >= 0`),
  check('source_runs_scope_len', sql`char_length(${table.scope}) <= 200`),
]);

export type ToolSuggestionRow = typeof toolSuggestions.$inferSelect;

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

// Comptes Merkod des créateurs (ADR-0021) : on se connecte par un lien reçu par e-mail, sans mot de passe.
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

// Preuve par la bio en libre-service (ADR-0041) : chaque créateur connecté reçoit SON code pour chaque compte qu'il revendique.
// Un usurpateur ne peut ni écraser ni bloquer le code du vrai créateur. Les codes d'un compte s'effacent dès qu'il est prouvé.
export const creatorClaimCodes = pgTable('creator_claim_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => creatorUsers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => creatorAccounts.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  /** Dernière lecture de la bio par Merkod (YouTube). */
  checkedAt: timestamp('checked_at', { withTimezone: true }),
  /** Autres réseaux : le créateur dit avoir mis le code, l'admin le constate sur le profil. */
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('creator_claim_codes_user_account_idx').on(table.userId, table.accountId),
  uniqueIndex('creator_claim_codes_code_idx').on(table.code),
  index('creator_claim_codes_account_idx').on(table.accountId),
  check('creator_claim_codes_code_format', sql`${table.code} ~ '^MERKOD-[A-Z0-9]{6}$'`),
]);

export type CreatorUserRow = typeof creatorUsers.$inferSelect;

// Interrupteurs du site (ADR-0022) : une ligne par page publique désactivable (« page:<clé> ») et le mode maintenance
// (« maintenance »). Une clé absente garde sa valeur par défaut : page en ligne, maintenance coupée.
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check('site_settings_key_format', sql`${table.key} ~ '^(maintenance|offer-links|page:[a-z-]{2,40})$'`),
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

// Images récupérées par Merkod et servies depuis Merkod (ADR-0027) : la photo de profil d'un créateur
// (sa chaîne YouTube) ou le logo d'un outil. Le navigateur des visiteurs ne contacte jamais Google ni le site de l'outil.
// Une image par créateur ou par outil, en base64 (150 Ko au plus), remplacée quand l'admin l'actualise.
export const STORED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] as const;
export const storedImages = pgTable('stored_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'cascade' }),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }),
  mime: text('mime', { enum: STORED_IMAGE_TYPES }).notNull(),
  data: text('data').notNull(),
  bytes: integer('bytes').notNull(),
  /** D'où vient l'image (photo de la chaîne, icône du site), pour la retrouver. */
  sourceUrl: text('source_url').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('stored_images_creator_unique').on(table.creatorId),
  uniqueIndex('stored_images_tool_unique').on(table.toolId),
  check('stored_images_one_owner', sql`(${table.creatorId} is null) <> (${table.toolId} is null)`),
  check('stored_images_bytes', sql`${table.bytes} between 1 and 153600`),
]);

// Avis des visiteurs envoyés depuis la page « Ton avis » (/feedback, ADR-0029) : remarques, idées, problèmes.
export const FEEDBACK_KINDS = ['remark', 'idea', 'problem'] as const;
export const FEEDBACK_STATUSES = ['new', 'read', 'done'] as const;
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind', { enum: FEEDBACK_KINDS }).notNull(),
  message: text('message').notNull(),
  /** Facultatif : seulement pour pouvoir répondre. Jamais affiché ni exporté. */
  email: text('email'),
  /** La page d'où venait le visiteur (chemin du site), pour situer une remarque. */
  fromPath: text('from_path'),
  status: text('status', { enum: FEEDBACK_STATUSES }).notNull().default('new'),
  adminNote: text('admin_note'),
  ipHash: text('ip_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  handledAt: timestamp('handled_at', { withTimezone: true }),
}, table => [
  index('feedback_status_created_idx').on(table.status, table.createdAt.desc()),
  check('feedback_kind_valid', sql`${table.kind} in ('remark','idea','problem')`),
  check('feedback_status_valid', sql`${table.status} in ('new','read','done')`),
  check('feedback_message_len', sql`char_length(${table.message}) between 1 and 2000`),
  check('feedback_email_len', sql`${table.email} is null or char_length(${table.email}) between 3 and 320`),
  check('feedback_from_path', sql`${table.fromPath} is null or (${table.fromPath} ~ '^/' and char_length(${table.fromPath}) <= 300)`),
]);

export const PODCAST_CANDIDATE_STATUSES = ['new', 'dismissed'] as const;

/** Un code repéré dans un épisode d'un podcast candidat (lib/podcast-index.ts). */
export type PodcastCandidateHit = { toolId: string; code: string; evidence: string; episodeTitle: string; episodeUrl: string | null; publishedAt: string | null };

// Podcasts candidats trouvés chaque semaine dans la base publique de Podcast Index (ADR-0036) : actifs, en français
// ou en anglais, et qui citent un outil du catalogue près d'un code. L'admin les suit (Podcasts > Candidats) ou les écarte.
export const podcastCandidates = pgTable('podcast_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Identifiant Apple Podcasts : c'est par lui qu'on suit le podcast, comme pour une recherche. */
  itunesId: text('itunes_id').notNull(),
  podcastIndexId: integer('podcast_index_id').notNull().default(0),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  feedUrl: text('feed_url').notNull(),
  imageUrl: text('image_url'),
  language: text('language').notNull().default(''),
  category: text('category').notNull().default(''),
  episodeCount: integer('episode_count').notNull().default(0),
  newestEpisodeAt: timestamp('newest_episode_at', { withTimezone: true }),
  /** Les codes d'outils du catalogue repérés au dernier passage (5 au plus). */
  hits: jsonb('hits').$type<PodcastCandidateHit[]>().notNull().default([]),
  status: text('status', { enum: PODCAST_CANDIDATE_STATUSES }).notNull().default('new'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex('podcast_candidates_itunes_idx').on(table.itunesId),
  index('podcast_candidates_status_idx').on(table.status, table.lastSeenAt.desc()),
  check('podcast_candidates_status_valid', sql`${table.status} in ('new','dismissed')`),
  check('podcast_candidates_itunes_format', sql`${table.itunesId} ~ '^[0-9]{1,15}$'`),
  check('podcast_candidates_title_len', sql`char_length(trim(${table.title})) between 1 and 200`),
  check('podcast_candidates_feed_url_http', sql`${table.feedUrl} ~* '^https?://'`),
  check('podcast_candidates_counts_positive', sql`${table.episodeCount} >= 0 and ${table.podcastIndexId} >= 0`),
]);
