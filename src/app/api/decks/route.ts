import { NextResponse } from "next/server";
import { db } from "@/db";
import { decks } from "@/db/schema";
import { desc } from "drizzle-orm";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const rows = await db.select().from(decks).orderBy(desc(decks.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(decks)
    .values({
      title: body.title.trim().slice(0, 140),
      subject:
        typeof body.subject === "string" && body.subject.trim()
          ? body.subject.trim().slice(0, 60)
          : "General",
      description:
        typeof body.description === "string"
          ? body.description.slice(0, 400)
          : "",
      color: typeof body.color === "string" && HEX.test(body.color) ? body.color : "#4F46E5",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
