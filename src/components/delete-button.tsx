"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  url,
  redirectTo,
  className,
}: {
  url: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 2500);
      return;
    }
    setBusy(true);
    await fetch(url, { method: "DELETE" });
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      title={armed ? "Click again to confirm" : "Delete"}
      aria-label="Delete"
      className={
        className ??
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-card text-ink-2 shadow-card transition-all hover:border-rose-300 hover:!text-rose-600"
      }
    >
      {armed ? (
        <span className="text-[10px] font-bold text-rose-600">Sure?</span>
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
