export const DECK_COLORS = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Teal", value: "#0D9488" },
  { name: "Amber", value: "#D97706" },
  { name: "Rose", value: "#E11D48" },
  { name: "Violet", value: "#7C3AED" },
  { name: "Sky", value: "#0284C7" },
] as const;

export const NODE_COLORS = [
  "#4F46E5",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
] as const;

/** Convert "#RRGGBB" + alpha into an rgba() string. */
export function tint(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
