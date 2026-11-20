import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(200);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const contextType =
    body.contextType === "note" || body.contextType === "map" ? body.contextType : null;
  const contextId =
    contextType && typeof body.contextId === "number" ? body.contextId : null;

  const [row] = await db
    .insert(conversations)
    .values({
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 120)
          : "New chat",
      contextType: contextId != null ? contextType : null,
      contextId,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
