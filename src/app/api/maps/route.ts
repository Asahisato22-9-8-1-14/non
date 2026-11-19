import { NextResponse } from "next/server";
import { db } from "@/db";
import { mapNodes, mindMaps, nodeLinks } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(mindMaps)
    .orderBy(desc(mindMaps.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const [map] = await db
    .insert(mindMaps)
    .values({
      title: body.title.trim().slice(0, 140),
      subject:
        typeof body.subject === "string" && body.subject.trim()
          ? body.subject.trim().slice(0, 60)
          : "General",
    })
    .returning();

  const [root] = await db
    .insert(mapNodes)
    .values({
      mapId: map.id,
      parentId: null,
      label:
        typeof body.rootLabel === "string" && body.rootLabel.trim()
          ? body.rootLabel.trim().slice(0, 140)
          : map.title,
      x: 0,
      y: 0,
      color: "#4F46E5",
    })
    .returning();

  // Optionally link the new root node straight to a card or note.
  let link = null;
  const cardId = typeof body.cardId === "number" ? body.cardId : null;
  const noteId = typeof body.noteId === "number" ? body.noteId : null;
  if (cardId != null || noteId != null) {
    const [created] = await db
      .insert(nodeLinks)
      .values({ nodeId: root.id, cardId, noteId })
      .returning({ id: nodeLinks.id });
    link = created.id;
  }

  return NextResponse.json({ ...map, root, linkId: link }, { status: 201 });
}
