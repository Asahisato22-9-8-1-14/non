export function dueLabel(nextReviewAt: string | null): string {
  if (!nextReviewAt) return "new";
  const diff = new Date(nextReviewAt).getTime() - Date.now();
  if (diff <= 0) return "due now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `in ${days}d`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const BOX_META: Record<number, { label: string; className: string }> = {
  1: { label: "Learning", className: "tag-rose" },
  2: { label: "Familiar", className: "tag-amber" },
  3: { label: "Solid", className: "tag-sky" },
  4: { label: "Strong", className: "tag-emerald" },
  5: { label: "Mastered", className: "tag-violet" },
};
