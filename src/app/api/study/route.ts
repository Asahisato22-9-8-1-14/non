import { NextResponse } from "next/server";
import { db } from "@/db";
import { cards, reviews } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isRating, nextBox, nextReviewDate } from "@/lib/srs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const cardId = typeof body?.cardId === "number" ? body.cardId : NaN;
  if (!Number.isInteger(cardId)) {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }
  if (!isRating(body?.rating)) {
    return NextResponse.json(
      { error: "rating must be one of: again, hard, good, easy" },
      { status: 400 },
    );
  }

  const [card] = await db
    .select()
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const box = nextBox(card.box, body.rating);
  const nextReviewAt = nextReviewDate(card.box, body.rating);

  const [updated] = await db
    .update(cards)
    .set({
      box,
      nextReviewAt,
      lastReviewedAt: new Date(),
    })
    .where(eq(cards.id, cardId))
    .returning({ id: cards.id, box: cards.box, nextReviewAt: cards.nextReviewAt });

  await db.insert(reviews).values({ cardId, rating: body.rating });

  return NextResponse.json({
    ok: true,
    card: updated,
    box,
  });
}
