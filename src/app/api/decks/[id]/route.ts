import { NextResponse } from "next/server";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { eq } from "drizzle-orm";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 140);
  if (typeof body.subject === "string" && body.subject.trim())
    patch.subject = body.subject.trim().slice(0, 60);
  if (typeof body.description === "string")
    patch.description = body.description.slice(0, 400);
  if (typeof body.color === "string" && HEX.test(body.color))
    patch.color = body.color;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [row] = await db
    .update(decks)
    .set(patch)
    .where(eq(decks.id, deckId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isInteger(deckId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(decks).where(eq(decks.id, deckId));
  return NextResponse.json({ ok: true });
}
