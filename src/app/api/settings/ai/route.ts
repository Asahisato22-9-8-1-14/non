import { NextResponse } from "next/server";
import {
  clearAiConfig,
  getAiStatus,
  getStoredAiConfig,
  saveAiConfig,
} from "@/lib/ai";
import { getPreset } from "@/lib/ai-providers";

export async function GET() {
  return NextResponse.json(await getAiStatus());
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const provider = typeof body.provider === "string" ? body.provider : "custom";
  const preset = getPreset(provider);
  const baseUrl =
    typeof body.baseUrl === "string" && body.baseUrl.trim()
      ? body.baseUrl.trim()
      : preset.baseUrl;
  const model =
    typeof body.model === "string" && body.model.trim() ? body.model.trim() : preset.model;

  if (!/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json(
      { error: "Base URL must start with http:// or https://" },
      { status: 400 },
    );
  }
  if (!model) {
    return NextResponse.json({ error: "Model name is required" }, { status: 400 });
  }

  // Empty key keeps the existing saved key (so users can change model only).
  let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) {
    const stored = await getStoredAiConfig();
    if (!stored) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    apiKey = stored.apiKey;
  }

  await saveAiConfig({ provider, baseUrl, model, apiKey });
  return NextResponse.json(await getAiStatus());
}

export async function DELETE() {
  await clearAiConfig();
  return NextResponse.json(await getAiStatus());
}
