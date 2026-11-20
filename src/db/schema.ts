import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const decks = pgTable("decks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull().default("General"),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("#4F46E5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  deckId: integer("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  box: integer("box").notNull().default(1),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  rating: text("rating").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mindMaps = pgTable("mind_maps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull().default("General"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mapNodes = pgTable("map_nodes", {
  id: serial("id").primaryKey(),
  mapId: integer("map_id")
    .notNull()
    .references(() => mindMaps.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references((): AnyPgColumn => mapNodes.id, {
    onDelete: "cascade",
  }),
  label: text("label").notNull(),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  color: text("color").notNull().default("#4F46E5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Cross-links a mind-map node to study material. Exactly one of
 * cardId / noteId is set (enforced in the API layer).
 */
export const nodeLinks = pgTable("node_links", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id")
    .notNull()
    .references(() => mapNodes.id, { onDelete: "cascade" }),
  cardId: integer("card_id").references(() => cards.id, { onDelete: "cascade" }),
  noteId: integer("note_id").references(() => notes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Untitled note"),
  content: text("content").notNull().default(""),
  subject: text("subject").notNull().default("General"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  AI chat + provider settings (StudyX assistant)                     */
/* ------------------------------------------------------------------ */

/** Simple key/value store for app-level settings (e.g. AI provider config). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New chat"),
  /** Optional study context: "note" | "map" */
  contextType: text("context_type"),
  contextId: integer("context_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
