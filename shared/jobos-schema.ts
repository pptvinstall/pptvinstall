import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";

// Job OS tables. ADDITIVE ONLY: no existing table or column is touched, and there are no
// foreign keys into existing tables (booking_id / customer_id / crm_contact_id are plain
// integers) so applying this schema can never alter or lock production booking data.
// Money is stored as integer cents. Quote versions are immutable by convention: the only
// permitted update is accepted_at.

export const pricingConfigs = pgTable(
  "pricing_configs",
  {
    id: serial("id").primaryKey(),
    version: integer("version").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    config: jsonb("config").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 80 }).notNull(),
    changeReason: text("change_reason"),
    changedPaths: jsonb("changed_paths").notNull().default([]),
  },
  (t) => ({ versionIdx: uniqueIndex("pricing_configs_version_idx").on(t.version) }),
);

export const pricingConfigEvents = pgTable("pricing_config_events", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  actor: varchar("actor", { length: 80 }).notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  details: text("details"),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: varchar("status", { length: 20 }).notNull().default("lead"),
    title: varchar("title", { length: 120 }).notNull(),
    customerLabel: varchar("customer_label", { length: 120 }),
    zip: varchar("zip", { length: 5 }),
    bookingId: integer("booking_id"),
    customerId: integer("customer_id"),
    crmContactId: integer("crm_contact_id"),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    scope: jsonb("scope").notNull(),
    context: jsonb("context").notNull().default({}),
    currentQuoteId: uuid("current_quote_id"),
    notes: text("notes"),
    /** Owner-entered customer details for documents, used only when no booking is linked (the booking is canonical). */
    contact: jsonb("contact"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ statusIdx: index("jobs_status_idx").on(t.status), bookingIdx: index("jobs_booking_idx").on(t.bookingId) }),
);

export const scopeItems = pgTable(
  "scope_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull(),
    kind: varchar("kind", { length: 10 }).notNull(),
    position: integer("position").notNull(),
    attributes: jsonb("attributes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ jobIdx: index("scope_items_job_idx").on(t.jobId) }),
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    shareToken: uuid("share_token").notNull().defaultRandom(),
    acceptedVersionId: uuid("accepted_version_id"),
    /** Customer-facing estimate number (EST-1001...), assigned when a document is first needed. */
    quoteNumber: integer("quote_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tokenIdx: uniqueIndex("quotes_share_token_idx").on(t.shareToken), jobIdx: index("quotes_job_idx").on(t.jobId) }),
);

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    customerView: jsonb("customer_view").notNull(),
    customerAmountCents: integer("customer_amount_cents").notNull(),
    recommendedCents: integer("recommended_cents").notNull(),
    floorCents: integer("floor_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    adjustment: jsonb("adjustment"),
    configVersion: integer("config_version").notNull(),
    engineVersion: varchar("engine_version", { length: 20 }).notNull(),
    snapshotHash: varchar("snapshot_hash", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => ({ quoteVersionIdx: uniqueIndex("quote_versions_quote_version_idx").on(t.quoteId, t.version) }),
);

export const travelEstimates = pgTable("travel_estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull(),
  quoteVersionId: uuid("quote_version_id"),
  data: jsonb("data").notNull(),
  source: varchar("source", { length: 30 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materialEstimates = pgTable("material_estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull(),
  quoteVersionId: uuid("quote_version_id"),
  lines: jsonb("lines").notNull(),
  costCents: integer("cost_cents").notNull(),
  chargeCents: integer("charge_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Named sequences for customer documents (e.g. "estimate"). */
export const documentCounters = pgTable("document_counters", {
  name: varchar("name", { length: 20 }).primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});

export const invoiceCounters = pgTable("invoice_counters", {
  year: integer("year").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull(),
    quoteVersionId: uuid("quote_version_id"),
    invoiceNumber: varchar("invoice_number", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    lines: jsonb("lines").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    paidCents: integer("paid_cents").notNull().default(0),
    taxConfigSnapshot: jsonb("tax_config_snapshot").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    dueDate: varchar("due_date", { length: 10 }),
    /** Customer-visible invoice notes. */
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ numberIdx: uniqueIndex("invoices_number_idx").on(t.invoiceNumber), jobIdx: index("invoices_job_idx").on(t.jobId) }),
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    method: varchar("method", { length: 20 }).notNull(),
    tipCents: integer("tip_cents").notNull().default(0),
    reference: varchar("reference", { length: 80 }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ invoiceIdx: index("payments_invoice_idx").on(t.invoiceId) }),
);

export const jobActuals = pgTable(
  "job_actuals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull(),
    quoteVersionId: uuid("quote_version_id"),
    actuals: jsonb("actuals").notNull(),
    profitability: jsonb("profitability"),
    configVersion: integer("config_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ jobIdx: uniqueIndex("job_actuals_job_idx").on(t.jobId) }),
);

export const aiIntakeCache = pgTable("ai_intake_cache", {
  inputHash: varchar("input_hash", { length: 32 }).primaryKey(),
  source: varchar("source", { length: 10 }).notNull(),
  intake: jsonb("intake").notNull(),
  hits: integer("hits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Shadow pricing samples: one row per distinct public quote per day (deduped by sample_key). The customer was shown
 * the catalog (or, in dynamic mode, the engine) price; the engine's full economics are stored for the owner only.
 * No contact details are stored: only ZIP and the structured scope the customer selected.
 */
export const pricingShadowSamples = pgTable(
  "pricing_shadow_samples",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    day: varchar("day", { length: 10 }).notNull(),
    sampleKey: varchar("sample_key", { length: 64 }).notNull(),
    source: varchar("source", { length: 20 }).notNull(),
    zip: varchar("zip", { length: 5 }),
    configVersion: integer("config_version").notNull(),
    pricingMode: varchar("pricing_mode", { length: 12 }).notNull(),
    shownCents: integer("shown_cents").notNull(),
    recommendedCents: integer("recommended_cents").notNull(),
    floorCents: integer("floor_cents").notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    scope: jsonb("scope").notNull(),
    context: jsonb("context").notNull(),
    summary: jsonb("summary").notNull(),
    jobId: uuid("job_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ dayKeyIdx: uniqueIndex("pricing_shadow_samples_day_key_idx").on(t.day, t.sampleKey), createdIdx: index("pricing_shadow_samples_created_idx").on(t.createdAt) }),
);

/** Private customer media metadata. Bytes are in object storage (storage_key), never in this table. */
export const jobMedia = pgTable(
  "job_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    intakeId: uuid("intake_id"),
    jobId: uuid("job_id"),
    source: varchar("source", { length: 10 }).notNull(),
    hint: varchar("hint", { length: 12 }).notNull(),
    contentType: varchar("content_type", { length: 40 }).notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    storageKey: varchar("storage_key", { length: 200 }).notNull(),
    thumbKey: varchar("thumb_key", { length: 200 }).notNull(),
    analysisStatus: varchar("analysis_status", { length: 12 }).notNull().default("pending"),
    analysisError: varchar("analysis_error", { length: 120 }),
    analysis: jsonb("analysis"),
    provider: varchar("provider", { length: 40 }),
    model: varchar("model", { length: 80 }),
    schemaVersion: varchar("schema_version", { length: 20 }),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({ intakeIdx: index("job_media_intake_idx").on(t.intakeId), jobIdx: index("job_media_job_idx").on(t.jobId) }),
);

export const intakeSessions = pgTable("intake_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: varchar("source", { length: 10 }).notNull(),
  jobId: uuid("job_id"),
  status: varchar("status", { length: 12 }).notNull().default("open"),
  proposal: jsonb("proposal"),
  review: jsonb("review"),
  messageChars: integer("message_chars").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
