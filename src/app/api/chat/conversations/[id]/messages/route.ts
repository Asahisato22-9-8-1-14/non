import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, conversations, mapNodes, mindMaps, notes } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  completionsUrl,
  getAiConfig,
  readProviderError,
  requestInit,
  type ChatTurn,
} from "@/lib/ai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are StudyX's study assistant, helping a student learn deeply rather than cram.
- Explain ideas clearly, starting from the big picture and building to detail.
- Prefer understanding (why/how, relationships between concepts) over rote facts.
- When useful, check understanding with a short question or suggest active recall.
- When asked for flashcards, write them as "Q: … / A: …" pairs, one atomic idea each.
- Be concise and use Markdown (headings, lists, tables, code) when it improves clarity.`;

const HISTORY_LIMIT = 30;

async function buildContext(type: string | null, id: number | null): Promise<string | null> {
  if (!type || id == null) return null;

  if (type === "note") {
    const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    if (!note) return null;
    return `The student attached this note as context. Use it when relevant.\n\n# ${note.title}\nSubject: ${note.subject}\n\n${note.content.slice(0, 12_000)}`;
  }

  if (type === "map") {
    const [map] = await db.select().from(mindMaps).where(eq(mindMaps.id, id)).limit(1);
    if (!map) return null;
    const nodes = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id)).orderBy(asc(mapNodes.id));
    const children = new Map<number | null, typeof nodes>();
    for (const n of nodes) {
      const list = children.get(n.parentId) ?? [];
      list.push(n);
      children.set(n.parentId, list);
    }
    const lines: string[] = [];
    const walk = (parent: number | null, depth: number) => {
      for (const n of children.get(parent) ?? []) {
        if (lines.length > 400) return;
        lines.push(`${"  ".repeat(depth)}- ${n.label}`);
        walk(n.id, depth + 1);
      }
    };
    walk(null, 0);
    return `The student attached their mind map "${map.title}" (subject: ${map.subject}) as context. Its structure:\n\n${lines.join("\n")}`;
  }
  return null;
}

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 47).trimEnd()}…` : clean || "New chat";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content.trim().slice(0, 20_000) : "";
  if (!content) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const ai = await getAiConfig();
  if (!ai) {
    return NextResponse.json(
      { error: "No AI provider connected. Add your API key in Settings.", code: "NO_KEY" },
      { status: 400 },
    );
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Persist the user's message and auto-title new conversations.
  await db.insert(chatMessages).values({ conversationId, role: "user", content });
  let title = conversation.title;
  if (title === "New chat") {
    title = titleFrom(content);
  }
  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Build the prompt: system + optional study context + recent history.
  const recent = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.id))
    .limit(HISTORY_LIMIT);
  const history = recent.reverse().map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  })) as ChatTurn[];

  const context = await buildContext(conversation.contextType, conversation.contextId);
  const messages: ChatTurn[] = [
    { role: "system", content: context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT },
    ...history,
  ];

  let upstream: Response;
  try {
    upstream = await fetch(
      completionsUrl(ai.config.baseUrl),
      requestInit(ai.config, messages, { stream: true, signal: req.signal }),
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Could not reach the AI provider: ${err instanceof Error ? err.message : "network error"}` },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: await readProviderError(upstream) }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              if (json.error) {
                const msg = typeof json.error === "string" ? json.error : json.error.message;
                const text = `\n\n⚠️ ${msg ?? "The provider reported an error."}`;
                full += text;
                controller.enqueue(encoder.encode(text));
                continue;
              }
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              /* ignore keep-alives / partial frames */
            }
          }
        }
      } catch {
        /* client aborted or upstream dropped — keep what we have */
      } finally {
        if (full.trim()) {
          await db
            .insert(chatMessages)
            .values({ conversationId, role: "assistant", content: full })
            .catch(() => {});
        }
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId))
          .catch(() => {});
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Conversation-Title": encodeURIComponent(title),
    },
  });
}
