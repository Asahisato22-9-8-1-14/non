import type { Rating } from "@/lib/srs";

export const RATING_ORDER: Rating[] = ["again", "hard", "good", "easy"];

export const RATING_STYLES: Record<
  Rating,
  { label: string; className: string; kbd: string; hint: string; textClass: string }
> = {
  again: {
    label: "Again",
    className: "bg-rose-600 text-white hover:bg-rose-500",
    kbd: "1",
    hint: "10 min",
    textClass: "text-rose-600",
  },
  hard: {
    label: "Hard",
    className: "bg-amber-500 text-white hover:bg-amber-400",
    kbd: "2",
    hint: "1 day",
    textClass: "text-amber-500",
  },
  good: {
    label: "Good",
    className: "bg-mint text-white hover:bg-emerald-600",
    kbd: "3",
    hint: "3 days",
    textClass: "text-mint",
  },
  easy: {
    label: "Easy",
    className: "bg-sky-600 text-white hover:bg-sky-500",
    kbd: "4",
    hint: "7 days",
    textClass: "text-sky-600",
  },
};
