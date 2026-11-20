import { NextResponse } from "next/server";
import {
  clearAiConfig,
  getAiStatus,
  getAiConfig,
  removeConnection,
  saveConnection,
  setActiveConnection,
} from "@/lib/ai";
import { MAX_CONNECTIONS, getPreset, type AiStatus } from "@/lib/ai-providers";

export async function GET() {
  return NextResponse.json(await getAiStatus());
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * POST adds a connection (1–5 total), PATCH edits one, PUT switches the active
 * connection and DELETE removes one (or all when no id is given).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid body");
  const provider = typeof body.provider === "string" ? body.provider : "custom";
  const preset = getPreset(provider);
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : preset.baseUrl;
  const model = typeof body.model === "string" && body.model.trim() ? body.model : preset.model;

  if (!/^https?:\/\//i.test(baseUrl)) {
    return badRequest("Base URL must start with http:// or https://");
  }
  if (!model) return badRequest("Model name is required");

  const result = await saveConnection({
    provider,
    label: typeof body.label === "string" ? body.label : undefined,
    baseUrl,
    model,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
  });
  if (!result.ok) return badRequest(result.error);
  return NextResponse.json(result.status, { status: 201 });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid body");
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return badRequest("Connection id is required");
  const provider = typeof body.provider === "string" ? body.provider : "custom";
  const preset = getPreset(provider);

  const result = await saveConnection({
    id,
    provider,
    label: typeof body.label === "string" ? body.label : undefined,
    baseUrl:
      typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl : preset.baseUrl,
    model: typeof body.model === "string" && body.model.trim() ? body.model : preset.model,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : "",
  });
  if (!result.ok) return badRequest(result.error);
  return NextResponse.json(result.status);
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid body");
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return badRequest("Connection id is required");
  const result = await setActiveConnection(id);
  if (!result.ok) return badRequest(result.error);
  return NextResponse.json(result.status);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    await clearAiConfig();
    const status: AiStatus = await getAiStatus();
    return NextResponse.json(status);
  }
  const result = await removeConnection(id);
  if (!result.ok) return badRequest(result.error);
  return NextResponse.json(result.status);
}

/** Chat calls this to know whether anything is connected. */
export async function HEAD() {
  const config = await getAiConfig();
  return new Response(null, {
    status: config ? 204 : 404,
    headers: { "X-Max-Connections": String(MAX_CONNECTIONS) },
  });
}
