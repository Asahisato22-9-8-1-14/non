import { desc } from "drizzle-orm";
import { db } from "@/db";
import { conversations, mindMaps, notes } from "@/db/schema";
import { getAiStatus } from "@/lib/ai";
import { ChatApp } from "@/components/chat-app";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [status, convRows, noteRows, mapRows] = await Promise.all([
    getAiStatus(),
    db.select().from(conversations).orderBy(desc(conversations.updatedAt)).limit(200),
    db.select({ id: notes.id, title: notes.title }).from(notes).orderBy(desc(notes.updatedAt)),
    db.select({ id: mindMaps.id, title: mindMaps.title }).from(mindMaps).orderBy(desc(mindMaps.updatedAt)),
  ]);

  const initialConversations = convRows.map((r) => ({
    id: r.id,
    title: r.title,
    contextType:
      r.contextType === "note" || r.contextType === "map"
        ? (r.contextType as "note" | "map")
        : null,
    contextId: r.contextId,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const requested = Number(c);
  const initialId = initialConversations.some((x) => x.id === requested) ? requested : null;

  return (
    <ChatApp
      status={status}
      initialConversations={initialConversations}
      initialConversationId={initialId}
      notes={noteRows}
      maps={mapRows}
    />
  );
}
