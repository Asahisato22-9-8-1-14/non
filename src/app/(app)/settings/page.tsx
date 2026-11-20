import { getAiStatus } from "@/lib/ai";
import { AiSettingsForm } from "@/components/ai-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const status = await getAiStatus();
  return (
    <div className="mx-auto max-w-2xl animate-fade-up px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm text-ink-3">Settings</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI &amp; API</h1>
      <p className="mt-2 text-sm text-ink-2">
        Connect your own API keys — 1 to 5 providers — and choose which one chat uses.
      </p>
      <div className="mt-8">
        <AiSettingsForm initialStatus={status} />
      </div>
    </div>
  );
}
