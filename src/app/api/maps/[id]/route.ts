import { NextResponse } from "next/server";
import { db } from "@/db";
import { mindMaps } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mapId = Number(id);
  if (!Number.isInteger(mapId)) {
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
  if (typeof body.title === "string" && body.title.trim())
    patch.title = body.title.trim().slice(0, 140);
  if (typeof body.subject === "string" && body.subject.trim())
    patch.subject = body.subject.trim().slice(0, 60);

  const [row] = await db
    .update(mindMaps)
    .set(patch)
    .where(eq(mindMaps.id, mapId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mapId = Number(id);
  if (!Number.isInteger(mapId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(mindMaps).where(eq(mindMaps.id, mapId));
  return NextResponse.json({ ok: true });
}
