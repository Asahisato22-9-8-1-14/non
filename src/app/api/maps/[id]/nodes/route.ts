import { NextResponse } from "next/server";
import { db } from "@/db";
import { mapNodes, mindMaps, nodeLinks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mapId = Number(id);
  if (!Number.isInteger(mapId)) {
    return NextResponse.json({ error: "Invalid map id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const parentId =
    typeof body?.parentId === "number" ? body.parentId : NaN;
  if (!Number.isInteger(parentId)) {
    return NextResponse.json({ error: "parentId is required" }, { status: 400 });
  }

  const [parent] = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.id, parentId))
    .limit(1);

  if (!parent || parent.mapId !== mapId) {
    return NextResponse.json({ error: "Parent node not found" }, { status: 404 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapNodes)
    .where(eq(mapNodes.parentId, parentId));

  const [row] = await db
    .insert(mapNodes)
    .values({
      mapId,
      parentId,
      label:
        typeof body?.label === "string" && body.label.trim()
          ? body.label.trim().slice(0, 140)
          : "New idea",
      x: parent.x + 260,
      y: parent.y + count * 56,
      color:
        typeof body?.color === "string" && HEX.test(body.color)
          ? body.color
          : parent.color,
    })
    .returning();

  await db
    .update(mindMaps)
    .set({ updatedAt: new Date() })
    .where(eq(mindMaps.id, mapId));

  // Optionally link the freshly created node to a card or note.
  const cardId = typeof body?.cardId === "number" ? body.cardId : null;
  const noteId = typeof body?.noteId === "number" ? body.noteId : null;
  let linkId: number | null = null;
  if (cardId != null || noteId != null) {
    const [created] = await db
      .insert(nodeLinks)
      .values({ nodeId: row.id, cardId, noteId })
      .returning({ id: nodeLinks.id });
    linkId = created.id;
  }

  return NextResponse.json({ ...row, linkId }, { status: 201 });
}
