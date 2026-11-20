import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, conversations } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

async function parseId(params: Ctx["params"]) {
  const { id } = await params;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(asc(chatMessages.id));

  return NextResponse.json({ conversation, messages });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) {
    patch.title = body.title.trim().slice(0, 120);
  }
  if ("contextType" in body) {
    const type = body.contextType === "note" || body.contextType === "map" ? body.contextType : null;
    const cid = type && typeof body.contextId === "number" ? body.contextId : null;
    patch.contextType = cid != null ? type : null;
    patch.contextId = cid;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [row] = await db
    .update(conversations)
    .set(patch)
    .where(eq(conversations.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = await parseId(params);
  if (id == null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ ok: true });
}
