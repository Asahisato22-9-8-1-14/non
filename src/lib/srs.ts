export const RATINGS = ["again", "hard", "good", "easy"] as const;
export type Rating = (typeof RATINGS)[number];

/** Minutes until a card comes back, by Leitner box (1–5). */
const MINUTES_BY_BOX: Record<number, number> = {
  1: 10, // 10 minutes
  2: 24 * 60, // 1 day
  3: 3 * 24 * 60, // 3 days
  4: 7 * 24 * 60, // 1 week
  5: 16 * 24 * 60, // ~2 weeks
};

export function clampBox(box: number): number {
  return Math.min(5, Math.max(1, Math.round(box)));
}

export function nextBox(box: number, rating: Rating): number {
  const b = clampBox(box);
  if (rating === "again") return 1;
  if (rating === "hard") return Math.max(1, b - 1);
  if (rating === "good") return Math.min(5, b + 1);
  return Math.min(5, b + 2);
}

export function nextReviewDate(currentBox: number, rating: Rating): Date {
  const nb = nextBox(currentBox, rating);
  return new Date(Date.now() + MINUTES_BY_BOX[nb] * 60 * 1000);
}

export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && (RATINGS as readonly string[]).includes(value);
}
