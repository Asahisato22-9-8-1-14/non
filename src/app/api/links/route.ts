import { NextResponse } from "next/server";
import { db } from "@/db";
import { cards, mapNodes, mindMaps, nodeLinks, notes } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

async function linkInfo(linkId: number) {
  const [row] = await db
    .select({
      id: nodeLinks.id,
      nodeId: nodeLinks.nodeId,
      nodeLabel: mapNodes.label,
      nodeColor: mapNodes.color,
      mapId: mindMaps.id,
      mapTitle: mindMaps.title,
      cardId: nodeLinks.cardId,
      noteId: nodeLinks.noteId,
    })
    .from(nodeLinks)
    .innerJoin(mapNodes, eq(nodeLinks.nodeId, mapNodes.id))
    .innerJoin(mindMaps, eq(mapNodes.mapId, mindMaps.id))
    .where(eq(nodeLinks.id, linkId))
    .limit(1);
  return row ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nodeId = Number(searchParams.get("nodeId"));
  if (!Number.isInteger(nodeId)) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  const cardRows = await db
    .select({
      id: cards.id,
      deckId: cards.deckId,
      front: cards.front,
      back: cards.back,
      box: cards.box,
      nextReviewAt: cards.nextReviewAt,
      lastReviewedAt: cards.lastReviewedAt,
      linkId: nodeLinks.id,
    })
    .from(nodeLinks)
    .innerJoin(cards, eq(nodeLinks.cardId, cards.id))
    .where(eq(nodeLinks.nodeId, nodeId))
    .orderBy(nodeLinks.id);

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
    .orderBy(nodeLinks.id);

  return NextResponse.json({
    cards: cardRows.map((r) => ({
      id: r.id,
      deckId: r.deckId,
      front: r.front,
      back: r.back,
      box: r.box,
      lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
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
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const nodeId = typeof body.nodeId === "number" ? body.nodeId : NaN;
  const cardId = typeof body.cardId === "number" ? body.cardId : null;
  const noteId = typeof body.noteId === "number" ? body.noteId : null;

  if (!Number.isInteger(nodeId)) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }
  if ((cardId == null) === (noteId == null)) {
    return NextResponse.json(
      { error: "Provide exactly one of cardId or noteId" },
      { status: 400 },
    );
  }

  const [node] = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.id, nodeId))
    .limit(1);
  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  if (cardId != null) {
    const [card] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
  }
  if (noteId != null) {
    const [note] = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
  }

  // Avoid duplicate links for the same pair.
  const existing = await db
    .select({ id: nodeLinks.id })
    .from(nodeLinks)
    .where(
      and(
        eq(nodeLinks.nodeId, nodeId),
        cardId != null
          ? eq(nodeLinks.cardId, cardId)
          : or(eq(nodeLinks.noteId, noteId as number), eq(nodeLinks.cardId, -1)),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const info = await linkInfo(existing[0].id);
    return NextResponse.json({ ...info, duplicate: true });
  }

  const [created] = await db
    .insert(nodeLinks)
    .values({
      nodeId,
      cardId: cardId ?? null,
      noteId: noteId ?? null,
    })
    .returning({ id: nodeLinks.id });

  await db
    .update(mindMaps)
    .set({ updatedAt: new Date() })
    .where(eq(mindMaps.id, node.mapId));

  const info = await linkInfo(created.id);
  return NextResponse.json(info, { status: 201 });
}
