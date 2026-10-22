import { sql } from 'drizzle-orm';
import {
	boolean,
	customType,
	date,
	index,
	integer,
	pgTable,
	pgView,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';
import { PROJECT_TYPES, type ProjectType } from '#lib/projects.ts';
import { SHOP_ITEMS, type AddOn, type ShopItemId } from '#lib/shop.ts';

// Bun's Postgres client reads these as Buffers over ordinary (not shared) ArrayBuffers
const bytea = customType<{ data: Uint8Array<ArrayBuffer>; driverData: Uint8Array<ArrayBuffer> }>({
	dataType: () => 'bytea'
});

// Columns are camelCase here and snake_case in Postgres (`casing` in drizzle.config.ts and the client)

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
	id: uuid().primaryKey().defaultRandom(),
	/** Where sign-in codes go, or the address Hack Club Auth reported. Always lowercase. */
	email: text().notNull().unique(),
	name: text(),
	role: text({ enum: ['user', 'reviewer', 'admin'] })
		.notNull()
		.default('user'),

	// Hack Club Auth. Set when someone signs in with Hack Club, or when an email account links one
	// to become eligible to submit. The verification fields mirror Hack Club's IDV result.
	hackClubId: text().unique(),
	slackId: text(),
	verificationStatus: text({ enum: ['needs_submission', 'pending', 'verified', 'ineligible'] }),
	yswsEligible: boolean(),
	verificationCheckedAt: timestamp({ withTimezone: true }),
	/** Encrypted, like every token column. Used to re-check verification when submitting. */
	hackClubAccessToken: text(),
	hackClubRefreshToken: text(),

	hackatimeAccessToken: text(),
	/** When this user's project hours were last refreshed from Hackatime */
	hackatimeSyncedAt: timestamp({ withTimezone: true }),
	/** Their numeric Hackatime ID, which hour justifications cite. Kept current by the activity check. */
	hackatimeUserId: integer(),
	/** Red means Hackatime has banned them. Kept current by the activity check. */
	hackatimeTrustLevel: text({ enum: ['blue', 'green', 'red'] }),
	/** From Hackatime, for the program's Airtable */
	githubUsername: text(),

	/** Banned people can't sign in */
	bannedAt: timestamp({ withTimezone: true }),
	banReason: text(),
	/**
	 * When an admin lifted their ban. A red Hackatime trust level bans automatically, but not
	 * someone an admin has decided to let back in.
	 */
	banLiftedAt: timestamp({ withTimezone: true }),

	createdAt: createdAt()
});

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 of the cookie's token, so the table alone can't be used to sign in */
		id: text().primaryKey(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp({ withTimezone: true }).notNull()
	},
	(table) => [index().on(table.userId)]
);

/** One live code per address: asking again replaces it */
export const signInCodes = pgTable('sign_in_codes', {
	email: text().primaryKey(),
	codeHash: text().notNull(),
	attempts: integer().notNull().default(0),
	expiresAt: timestamp({ withTimezone: true }).notNull(),
	createdAt: createdAt()
});

export const projects = pgTable(
	'projects',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		type: text({ enum: Object.keys(PROJECT_TYPES) as [ProjectType, ...ProjectType[]] }).notNull(),
		description: text().notNull().default(''),
		repoUrl: text(),
		demoUrl: text(),
		/** Where its screenshot is served from, if it has one */
		thumbnailUrl: text(),
		/** The owner's Hackatime projects whose time counts toward this one */
		hackatimeProjects: text()
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		/** Time on those projects since the program started, as of the owner's last Hackatime sync */
		secondsLogged: integer().notNull().default(0),
		createdAt: createdAt()
	},
	(table) => [index().on(table.userId), index().on(table.createdAt)]
);

/** Project screenshots, kept in the database so there's no separate file storage to run */
export const screenshots = pgTable('screenshots', {
	projectId: uuid()
		.primaryKey()
		.references(() => projects.id, { onDelete: 'cascade' }),
	contentType: text().notNull(),
	data: bytea().notNull(),
	createdAt: createdAt()
});

export const submissions = pgTable(
	'submissions',
	{
		id: uuid().primaryKey().defaultRandom(),
		projectId: uuid()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		status: text({ enum: ['pending', 'approved', 'rejected', 'changes_requested'] })
			.notNull()
			.default('pending'),
		/** Hackatime time since the program started, as of submitting */
		secondsLogged: integer().notNull(),
		/** What the reviewer counted, which may be less than what was logged */
		secondsApproved: integer(),
		reviewerId: uuid().references(() => users.id, { onDelete: 'set null' }),
		/** Why it was rejected, which the participant sees */
		reason: text(),
		/** The approval's justification: internal, for Airtable and spot-checkers */
		reviewerNotes: text(),
		/** BFTs the approval awarded */
		bftsAwarded: integer(),
		/** Its project in Robert, Telescreen's fraud review desk, once sent there */
		robertProjectId: text(),
		/** Robert's state when last checked: awaiting_review, awaiting_outcome, rejected_fraud or decided */
		robertState: text(),
		/** Robert's fraud reviewer's score, 1 to 10 */
		robertTrustScore: integer(),
		/** Robert's fraud reviewer's note */
		robertNote: text(),
		/** Set once the approved project has been reported to the program's Airtable base */
		airtableRecordId: text(),
		createdAt: createdAt(),
		reviewedAt: timestamp({ withTimezone: true })
	},
	(table) => [index().on(table.projectId), index().on(table.status)]
);

/**
 * How long each person worked on their projects each day: what makes them a daily active user.
 * Filled in by the activity check, with rows only for days they did some work.
 */
export const dailyActivity = pgTable(
	'daily_activity',
	{
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** A day in UTC */
		day: date({ mode: 'string' }).notNull(),
		/** Logged that day on the Hackatime projects linked to their TRMNT projects */
		seconds: integer().notNull(),
		checkedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
	},
	(table) => [primaryKey({ columns: [table.userId, table.day] }), index().on(table.day)]
);

/**
 * One row per Hackatime project linked to a TRMNT project, the shape Hack Club's DAU wizard
 * (dashbored) wants for mapping people to their Hackatime projects
 */
export const hackatimeProjectLinks = pgView('hackatime_project_links', {
	userId: uuid('user_id').notNull(),
	hackatimeUserId: integer('hackatime_user_id'),
	slackId: text('slack_id'),
	projectId: uuid('project_id').notNull(),
	hackatimeProject: text('hackatime_project').notNull()
}).as(sql`
	select projects.user_id, users.hackatime_user_id, users.slack_id, projects.id as project_id,
		unnest(projects.hackatime_projects) as hackatime_project
	from projects join users on users.id = projects.user_id
`);

/** Things bought in the shop. Their BFTs are spent by a ledger row pointing back here. */
export const orders = pgTable(
	'orders',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		item: text({ enum: Object.keys(SHOP_ITEMS) as [ShopItemId, ...ShopItemId[]] }).notNull(),
		/** An extra taken while buying, like the Clarity Kit upgrade */
		addOn: text({ enum: ['clarity_kit', 'byod_license'] as const satisfies readonly AddOn[] }),
		/** What was paid in BFTs, extra included, so later price changes don't rewrite history */
		price: integer().notNull(),
		status: text({ enum: ['pending', 'fulfilled', 'cancelled'] })
			.notNull()
			.default('pending'),
		createdAt: createdAt(),
		fulfilledAt: timestamp({ withTimezone: true }),
		trackingNumber: text(),
		/** An admin's note on fulfilling or cancelling it, which the participant is sent */
		note: text(),
		/** Cancelled orders are refunded */
		cancelledAt: timestamp({ withTimezone: true })
	},
	(table) => [index().on(table.userId), index().on(table.status)]
);

/** Every BFT earned or spent. A user's balance is the sum of their amounts. */
export const ledger = pgTable(
	'ledger',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** Positive for credits, negative for spending */
		amount: integer().notNull(),
		reason: text({
			enum: ['submission_approved', 'shop_order', 'shop_refund', 'adjustment']
		}).notNull(),
		submissionId: uuid().references(() => submissions.id, { onDelete: 'set null' }),
		orderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
		note: text(),
		/** The admin behind an approval or adjustment */
		createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(table) => [index().on(table.userId)]
);

export type User = typeof users.$inferSelect;
