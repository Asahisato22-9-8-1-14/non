import { NextResponse } from "next/server";
import { db } from "@/db";
import { mapNodes, mindMaps } from "@/db/schema";
import { eq } from "drizzle-orm";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const nodeId = Number(id);
  if (!Number.isInteger(nodeId)) {
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
  if (typeof body.label === "string" && body.label.trim())
    patch.label = body.label.trim().slice(0, 140);
  if (typeof body.x === "number" && Number.isFinite(body.x))
    patch.x = body.x;
  if (typeof body.y === "number" && Number.isFinite(body.y))
    patch.y = body.y;
  if (typeof body.color === "string" && HEX.test(body.color))
    patch.color = body.color;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [row] = await db
    .update(mapNodes)
    .set(patch)
    .where(eq(mapNodes.id, nodeId))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  await db
    .update(mindMaps)
    .set({ updatedAt: new Date() })
    .where(eq(mindMaps.id, row.mapId));

  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const nodeId = Number(id);
  if (!Number.isInteger(nodeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [node] = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.id, nodeId))
    .limit(1);

  if (!node) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  // Re-parent children to this node's parent before removing it,
  // so no subtree is ever lost.
  await db
    .update(mapNodes)
    .set({ parentId: node.parentId })
    .where(eq(mapNodes.parentId, nodeId));

  await db.delete(mapNodes).where(eq(mapNodes.id, nodeId));

  await db
    .update(mindMaps)
    .set({ updatedAt: new Date() })
    .where(eq(mindMaps.id, node.mapId));

  return NextResponse.json({ ok: true });
}
