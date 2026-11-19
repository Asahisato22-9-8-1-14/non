import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(notes).orderBy(desc(notes.updatedAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<
    string,
    unknown
  > | null;

  const [row] = await db
    .insert(notes)
    .values({
      title:
        typeof body?.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 140)
          : "Untitled note",
      content: typeof body?.content === "string" ? body.content.slice(0, 20000) : "",
      subject:
        typeof body?.subject === "string" && body.subject.trim()
          ? body.subject.trim().slice(0, 60)
          : "General",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
