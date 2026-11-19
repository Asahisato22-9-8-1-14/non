import { NextResponse } from "next/server";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const deckId = typeof body?.deckId === "number" ? body.deckId : NaN;
  if (!Number.isInteger(deckId)) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }
  if (
    typeof body?.front !== "string" ||
    !body.front.trim() ||
    typeof body?.back !== "string" ||
    !body.back.trim()
  ) {
    return NextResponse.json(
      { error: "Front and back are required" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(cards)
    .values({
      deckId,
      front: body.front.trim().slice(0, 500),
      back: body.back.trim().slice(0, 1000),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deckId = Number(searchParams.get("deckId"));
  if (!Number.isInteger(deckId)) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }
  const rows = await db.select().from(cards).where(eq(cards.deckId, deckId));
  return NextResponse.json(rows);
}
