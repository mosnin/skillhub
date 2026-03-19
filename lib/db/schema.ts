import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  stripeAccountId: text('stripe_account_id'),
  stripeAccountEnabled: boolean('stripe_account_enabled').default(false),
  totalEarningsCents: integer('total_earnings_cents').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  content: text('content').notNull(),
  readme: text('readme'),
  version: text('version').notNull().default('1.0.0'),
  category: text('category').notNull(),
  tags: text('tags').array().default([]),
  priceCents: integer('price_cents').notNull().default(0),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  downloads: integer('downloads').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  isSuspended: boolean('is_suspended').notNull().default(false),

  // OpenClaw-compatible fields
  compatibleWith: text('compatible_with').array().default(['claude-code']),
  userInvocable: boolean('user_invocable').notNull().default(true),
  homepage: text('homepage'),
  skillMetadata: jsonb('skill_metadata'), // stores openclaw metadata.openclaw block

  // GitHub import tracking
  githubRepo: text('github_repo'),
  githubPath: text('github_path'),
  githubRef: text('github_ref'),

  // Admin
  adminNote: text('admin_note'),

  // Validation
  validationStatus: text('validation_status').notNull().default('pending'),
  validationErrors: text('validation_errors').array().default([]),
  validationWarnings: text('validation_warnings').array().default([]),

  // Security scanning
  scanStatus: text('scan_status').notNull().default('pending'),
  scanId: text('scan_id'),
  scanResults: jsonb('scan_results'),
  scanCompletedAt: timestamp('scan_completed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const skillVersions = pgTable('skill_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  content: text('content').notNull(),
  changelog: text('changelog'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  platformFeeCents: integer('platform_fee_cents').notNull(),
  creatorEarningsCents: integer('creator_earnings_cents').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeTransferId: text('stripe_transfer_id'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserSkill: unique().on(table.userId, table.skillId),
  })
)

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'new_sale' | 'new_review' | 'scan_complete' | 'new_version' | 'admin_note'
  title: text('title').notNull(),
  body: text('body').notNull(),
  href: text('href'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const skillViews = pgTable('skill_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  visitorHash: text('visitor_hash'), // hashed IP+UA for dedup without storing PII
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const collectionSkills = pgTable('collection_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collections.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// CLI login flow: browser-based token exchange
export const cliLoginTokens = pgTable('cli_login_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert
export type Purchase = typeof purchases.$inferSelect
export type Review = typeof reviews.$inferSelect
export type ApiKey = typeof apiKeys.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type Collection = typeof collections.$inferSelect
