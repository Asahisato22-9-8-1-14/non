import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 140) || "Untitled note";
  if (typeof body.content === "string") patch.content = body.content.slice(0, 20000);
  if (typeof body.subject === "string") patch.subject = body.subject.trim().slice(0, 60) || "General";
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;

  const [row] = await db
    .update(notes)
    .set(patch)
    .where(eq(notes.id, noteId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const noteId = Number(id);
  if (!Number.isInteger(noteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(notes).where(eq(notes.id, noteId));
  return NextResponse.json({ ok: true });
}
