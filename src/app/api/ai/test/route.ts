import { NextResponse } from "next/server";
import {
  completionsUrl,
  getAiConfig,
  readProviderError,
  requestInit,
  type AiConfig,
} from "@/lib/ai";
import { getPreset } from "@/lib/ai-providers";

/** Test either the unsaved form values (merged with the saved key) or the saved config. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const saved = await getAiConfig();

  const provider =
    typeof body.provider === "string" ? body.provider : (saved?.config.provider ?? "openai");
  const preset = getPreset(provider);
  const config: AiConfig = {
    provider,
    baseUrl:
      (typeof body.baseUrl === "string" && body.baseUrl.trim()) ||
      saved?.config.baseUrl ||
      preset.baseUrl,
    model:
      (typeof body.model === "string" && body.model.trim()) ||
      saved?.config.model ||
      preset.model,
    apiKey:
      (typeof body.apiKey === "string" && body.apiKey.trim()) || saved?.config.apiKey || "",
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
