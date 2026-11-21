/**
 * CALCULATIONS: small helpers that turn raw data into useful numbers.
 *   - how many days ago something happened
 *   - which applications need a follow-up
 *   - reply rate and interview rate per CV
 */
import type { Application, Cv, Status, TimelineEvent } from "./types";
import { STATUSES } from "./statuses";

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(toIso.slice(0, 10) + "T00:00:00Z");
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function lastActivity(app: Application, events: TimelineEvent[]): string {
  let last = app.applied_at;
  for (const e of events) if (e.application_id === app.id && e.at > last) last = e.at;
  return last;
}

/** Applications still waiting on a reply for longer than their follow-up window. */
export function needsFollowUp(app: Application, events: TimelineEvent[], today: string) {
  if (app.status !== "applied") return null;
  const days = daysBetween(lastActivity(app, events), today);
  return days >= app.follow_up_days ? days : null;
}

export function relativeDays(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "1 day ago";
  if (n < 30) return `${n} days ago`;
  const m = Math.round(n / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export type CvStats = {
  cv: Cv | null;
  total: number;
  byStatus: Record<Status, number>;
  /** Share of sent applications that got any reply (interview, offer or rejection). */
  responseRate: number;
  /** Share of sent applications that reached interview or offer. */
  interviewRate: number;
};

export function statsFor(cv: Cv | null, apps: Application[], events: TimelineEvent[]): CvStats {
  const mine = apps.filter((a) => (cv ? a.cv_id === cv.id : a.cv_id === null));
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const a of mine) byStatus[a.status]++;

  const sent = mine.filter((a) => a.status !== "saved");
  // An application counts as "reached interview" if it is or ever was in interview/offer.
  const reachedInterview = sent.filter(
    (a) =>
      a.status === "interview" ||
      a.status === "offer" ||
      events.some((e) => e.application_id === a.id && (e.status === "interview" || e.status === "offer")),
  ).length;
  const replied = sent.filter((a) => a.status !== "applied").length;

  return {
    cv,
    total: mine.length,
    byStatus,
    responseRate: sent.length ? replied / sent.length : 0,
    interviewRate: sent.length ? reachedInterview / sent.length : 0,
  };
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
