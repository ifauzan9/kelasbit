import type { Subject } from "./constants";

export const SUBJECT_STYLES: Record<
  Subject,
  { badge: string; tile: string; dot: string }
> = {
  Informatika: {
    badge: "bg-sky-50 text-sky-700 ring-sky-100",
    tile: "bg-sky-50 text-sky-600 ring-sky-100",
    dot: "bg-sky-500",
  },
  KKA: {
    badge: "bg-violet-50 text-violet-700 ring-violet-100",
    tile: "bg-violet-50 text-violet-600 ring-violet-100",
    dot: "bg-violet-500",
  },
};

export function toSubject(value: string): Subject {
  return value === "KKA" ? "KKA" : "Informatika";
}
