/**
 * STATUSES: the five stages an application can be in, and their colors.
 *   Saved → Applied → Interview → Offer / Rejected
 * To change a color or a name, change it here.
 */
export const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; dot: string; bar: string; ring: string; tint: string }
> = {
  saved: {
    label: "Saved",
    dot: "bg-zinc-400",
    bar: "border-t-zinc-400",
    ring: "outline-zinc-400",
    tint: "bg-zinc-500/[0.06]",
  },
  applied: {
    label: "Applied",
    dot: "bg-blue-500",
    bar: "border-t-blue-500",
    ring: "outline-blue-500",
    tint: "bg-blue-500/[0.07]",
  },
  interview: {
    label: "Interview",
    dot: "bg-amber-500",
    bar: "border-t-amber-500",
    ring: "outline-amber-500",
    tint: "bg-amber-500/[0.08]",
  },
  offer: {
    label: "Offer",
    dot: "bg-emerald-500",
    bar: "border-t-emerald-500",
    ring: "outline-emerald-500",
    tint: "bg-emerald-500/[0.08]",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-rose-500",
    bar: "border-t-rose-500",
    ring: "outline-rose-500",
    tint: "bg-rose-500/[0.07]",
  },
};

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}
