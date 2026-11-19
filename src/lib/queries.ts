import { db } from "@/db";
import {
  cards,
  decks,
  mapNodes,
  mindMaps,
  nodeLinks,
  notes,
  reviews,
} from "@/db/schema";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type {
  CardRow,
  Deck,
  DeckPicker,
  DeckWithStats,
  LinkRow,
  MapNodeRow,
  MapSummary,
  MapWithNodes,
  NodeLinks,
  NoteRow,
  Stats,
} from "@/lib/types";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export async function getDecksWithStats(): Promise<DeckWithStats[]> {
  const rows = await db
    .select({
      id: decks.id,
      title: decks.title,
      subject: decks.subject,
      description: decks.description,
      color: decks.color,
      createdAt: decks.createdAt,
      total: sql<number>`count(${cards.id})::int`,
      due: sql<number>`count(case when ${cards.nextReviewAt} <= now() then 1 end)::int`,
      mastered: sql<number>`count(case when ${cards.box} >= 4 then 1 end)::int`,
    })
    .from(decks)
    .leftJoin(cards, eq(cards.deckId, decks.id))
    .groupBy(decks.id)
    .orderBy(desc(decks.createdAt));

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function getDeck(id: number): Promise<Deck | null> {
  const [row] = await db.select().from(decks).where(eq(decks.id, id)).limit(1);
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}

export async function getDeckCards(deckId: number): Promise<CardRow[]> {
  const rows = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(desc(cards.box), desc(cards.createdAt));
  return rows.map((r) => ({
    id: r.id,
    deckId: r.deckId,
    front: r.front,
    back: r.back,
    box: r.box,
    lastReviewedAt: iso(r.lastReviewedAt),
    nextReviewAt: r.nextReviewAt.toISOString(),
  }));
}

export async function getDueCards(deckId: number): Promise<CardRow[]> {
  const rows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.deckId, deckId), lte(cards.nextReviewAt, new Date())))
    .orderBy(cards.nextReviewAt)
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    deckId: r.deckId,
    front: r.front,
    back: r.back,
    box: r.box,
    lastReviewedAt: iso(r.lastReviewedAt),
    nextReviewAt: r.nextReviewAt.toISOString(),
  }));
}

export async function getAllDeckCards(deckId: number): Promise<CardRow[]> {
  const rows = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(desc(cards.box))
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    deckId: r.deckId,
    front: r.front,
    back: r.back,
    box: r.box,
    lastReviewedAt: iso(r.lastReviewedAt),
    nextReviewAt: r.nextReviewAt.toISOString(),
  }));
}

export async function getMapsWithNodes(): Promise<MapWithNodes[]> {
  const maps = await db.select().from(mindMaps).orderBy(desc(mindMaps.updatedAt));
  const nodes = await db.select().from(mapNodes).orderBy(mapNodes.id);
  return maps.map((m) => ({
    id: m.id,
    title: m.title,
    subject: m.subject,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    nodes: nodes.filter((n) => n.mapId === m.id).map((n) => ({
      id: n.id,
      mapId: n.mapId,
      parentId: n.parentId,
      label: n.label,
      x: n.x,
      y: n.y,
      color: n.color,
    })),
  }));
}

export async function getMap(id: number): Promise<MapWithNodes | null> {
  const [m] = await db.select().from(mindMaps).where(eq(mindMaps.id, id)).limit(1);
  if (!m) return null;
  const nodes = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.mapId, id))
    .orderBy(mapNodes.id);
  return {
    id: m.id,
    title: m.title,
    subject: m.subject,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    nodes: nodes.map((n) => ({
      id: n.id,
      mapId: n.mapId,
      parentId: n.parentId,
      label: n.label,
      x: n.x,
      y: n.y,
      color: n.color,
    })),
  };
}

export async function getNotes(): Promise<NoteRow[]> {
  const rows = await db
    .select()
    .from(notes)
    .orderBy(desc(notes.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    subject: r.subject,
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getStats(): Promise<Stats> {
  const [deckCount] = await db.select({ c: sql<number>`count(*)::int` }).from(decks);
  const [mapCount] = await db.select({ c: sql<number>`count(*)::int` }).from(mindMaps);
  const [noteCount] = await db.select({ c: sql<number>`count(*)::int` }).from(notes);
  const [cardAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      due: sql<number>`count(case when ${cards.nextReviewAt} <= now() then 1 end)::int`,
      mastered: sql<number>`count(case when ${cards.box} >= 4 then 1 end)::int`,
    })
    .from(cards);

  const dayRows = await db
    .select({ day: sql<string>`to_char(${reviews.reviewedAt}, 'YYYY-MM-DD')` })
    .from(reviews)
    .groupBy(sql`1`);

  const days = new Set(dayRows.map((r) => r.day));
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const cursor = new Date();
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const today = new Date();
  const reviewedToday = days.has(fmt(today)) ? 1 : 0;

  return {
    dueToday: cardAgg?.due ?? 0,
    totalCards: cardAgg?.total ?? 0,
    mastered: cardAgg?.mastered ?? 0,
    decks: deckCount?.c ?? 0,
    maps: mapCount?.c ?? 0,
    notes: noteCount?.c ?? 0,
    streak,
    reviewedToday,
  };
}

/* ------------------------------------------------------------------ */
/*  Concept links: mind-map nodes  <->  flashcards / notes            */
/* ------------------------------------------------------------------ */

const linkSelection = {
  id: nodeLinks.id,
  nodeId: nodeLinks.nodeId,
  nodeLabel: mapNodes.label,
  nodeColor: mapNodes.color,
  mapId: mindMaps.id,
  mapTitle: mindMaps.title,
  cardId: nodeLinks.cardId,
  noteId: nodeLinks.noteId,
};

export async function getLinksForDeckCards(deckId: number): Promise<LinkRow[]> {
  const rows = await db
    .select(linkSelection)
    .from(nodeLinks)
    .innerJoin(mapNodes, eq(nodeLinks.nodeId, mapNodes.id))
    .innerJoin(mindMaps, eq(mapNodes.mapId, mindMaps.id))
    .innerJoin(cards, eq(nodeLinks.cardId, cards.id))
    .where(eq(cards.deckId, deckId))
    .orderBy(nodeLinks.id);
  return rows;
}

export async function getLinksForAllNotes(): Promise<LinkRow[]> {
  const rows = await db
    .select(linkSelection)
    .from(nodeLinks)
    .innerJoin(mapNodes, eq(nodeLinks.nodeId, mapNodes.id))
    .innerJoin(mindMaps, eq(mapNodes.mapId, mindMaps.id))
    .innerJoin(notes, eq(nodeLinks.noteId, notes.id))
    .orderBy(nodeLinks.id);
  return rows;
}

export async function getLinksForNode(nodeId: number): Promise<NodeLinks> {
  const cardRows = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      box: cards.box,
      lastReviewedAt: cards.lastReviewedAt,
      nextReviewAt: cards.nextReviewAt,
      linkId: sql<number>`${nodeLinks.id}::int`,
    })
    .from(nodeLinks)
    .innerJoin(cards, eq(nodeLinks.cardId, cards.id))
    .where(eq(nodeLinks.nodeId, nodeId))
    .orderBy(desc(cards.box));

  const noteRows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      subject: notes.subject,
      pinned: notes.pinned,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      linkId: nodeLinks.id,
    })
    .from(nodeLinks)
    .innerJoin(notes, eq(nodeLinks.noteId, notes.id))
    .where(eq(nodeLinks.nodeId, nodeId))
    .orderBy(desc(notes.updatedAt));

  return {
    cards: cardRows.map((r) => ({
      id: r.id,
      deckId: r.deckId,
      front: r.front,
      back: r.back,
      box: r.box,
      lastReviewedAt: iso(r.lastReviewedAt),
      nextReviewAt: r.nextReviewAt.toISOString(),
      linkId: r.linkId,
    })),
    notes: noteRows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      subject: r.subject,
      pinned: r.pinned,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      linkId: r.linkId,
    })),
  };
}

/** Distinct node ids in a map that have at least one link. */
export async function getLinkedNodeIds(mapId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ nodeId: nodeLinks.nodeId })
    .from(nodeLinks)
    .innerJoin(mapNodes, eq(nodeLinks.nodeId, mapNodes.id))
    .where(eq(mapNodes.mapId, mapId));
  return rows.map((r) => r.nodeId);
}

/** Lightweight maps + node lists for the "link to mind map" pickers. */
export async function getMapsForPicker(): Promise<MapSummary[]> {
  const maps = await db
    .select({ id: mindMaps.id, title: mindMaps.title, subject: mindMaps.subject })
    .from(mindMaps)
    .orderBy(desc(mindMaps.updatedAt));
  const nodes = await db
    .select({
      id: mapNodes.id,
      mapId: mapNodes.mapId,
      parentId: mapNodes.parentId,
      label: mapNodes.label,
      color: mapNodes.color,
    })
    .from(mapNodes)
    .orderBy(mapNodes.id);

  return maps.map((m) => ({
    id: m.id,
    title: m.title,
    subject: m.subject,
    nodes: nodes
      .filter((n) => n.mapId === m.id)
      .map((n) => ({ id: n.id, parentId: n.parentId, label: n.label, color: n.color })),
  }));
}

/** Decks with a compact card list, for the "link a flashcard" picker. */
export async function getDecksWithCardsForPicker(): Promise<DeckPicker[]> {
  const deckRows = await db
    .select({ id: decks.id, title: decks.title, color: decks.color })
    .from(decks)
    .orderBy(desc(decks.createdAt));
  const cardRows = await db
    .select({ id: cards.id, deckId: cards.deckId, front: cards.front })
    .from(cards)
    .orderBy(cards.id);

  return deckRows.map((d) => ({
    id: d.id,
    title: d.title,
    color: d.color,
    cards: cardRows
      .filter((c) => c.deckId === d.id)
      .map((c) => ({ id: c.id, front: c.front })),
  }));
}
