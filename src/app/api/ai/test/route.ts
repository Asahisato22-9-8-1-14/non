import { NextResponse } from "next/server";
import {
  completionsUrl,
  getAiConfig,
  getAiConfigById,
  readProviderError,
  requestInit,
  type AiConfig,
} from "@/lib/ai";
import { getPreset } from "@/lib/ai-providers";

/**
 * Test unsaved form values (merged with any stored key for that connection),
 * one saved connection by id, or — with no id — the active connection.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const savedById =
    typeof body.id === "string" && body.id ? await getAiConfigById(body.id) : null;
  const savedActive = savedById ? null : await getAiConfig();
  const saved = savedById ?? savedActive?.config ?? null;

  const provider =
    typeof body.provider === "string" ? body.provider : (saved?.provider ?? "openai");
  const preset = getPreset(provider);
  const config: AiConfig = {
    provider,
    baseUrl:
      (typeof body.baseUrl === "string" && body.baseUrl.trim()) ||
      saved?.baseUrl ||
      preset.baseUrl,
    model:
      (typeof body.model === "string" && body.model.trim()) ||
      saved?.model ||
      preset.model,
    apiKey:
      (typeof body.apiKey === "string" && body.apiKey.trim()) || saved?.apiKey || "",
  };

  if (!config.apiKey) {
    return NextResponse.json({ ok: false, error: "Enter an API key first." });
  }
  if (!/^https?:\/\//i.test(config.baseUrl)) {
    return NextResponse.json({ ok: false, error: "Base URL must start with https://" });
  }

  try {
    const res = await fetch(
      completionsUrl(config.baseUrl),
      requestInit(
        config,
        [{ role: "user", content: "Reply with exactly the word: OK" }],
        { stream: false, signal: AbortSignal.timeout(25_000) },
      ),
    );
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: await readProviderError(res) });
    }
    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({
      ok: true,
      model: data?.model ?? config.model,
      reply: reply.slice(0, 120),
    });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "The provider did not respond within 25 seconds."
        : `Could not reach the provider: ${err instanceof Error ? err.message : "network error"}`;
    return NextResponse.json({ ok: false, error: msg });
  }
}
