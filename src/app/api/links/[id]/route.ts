import { NextResponse } from "next/server";
import { db } from "@/db";
import { nodeLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const linkId = Number(id);
  if (!Number.isInteger(linkId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await db.delete(nodeLinks).where(eq(nodeLinks.id, linkId));
  return NextResponse.json({ ok: true });
}
