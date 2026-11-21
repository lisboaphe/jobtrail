/**
 * INSIGHTS: numbers about your job search.
 * Totals, where everything stands, applications sent per week,
 * and which CV gets you to an interview most often.
 */
"use client";

import type { Application, Cv, TimelineEvent } from "@/lib/types";
import { STATUSES, STATUS_META } from "@/lib/statuses";
import { daysBetween, pct, statsFor } from "@/lib/calculations";

type Props = { cvs: Cv[]; applications: Application[]; events: TimelineEvent[]; today: string };

export default function Insights({ cvs, applications, events, today }: Props) {
  const all = statsFor(null, applications.map((a) => ({ ...a, cv_id: null })), events);
  const perCv = cvs.map((cv) => statsFor(cv, applications, events)).filter((s) => s.total > 0);
  const best = perCv
    .filter((s) => s.total - s.byStatus.saved >= 3)
    .sort((a, b) => b.interviewRate - a.interviewRate)[0];

  // Applications sent per week over the last 8 weeks.
  const weeks = Array.from({ length: 8 }, (_, i) => 7 - i).map((w) => ({
    label: w === 0 ? "this wk" : `${w}w ago`,
    count: applications.filter((a) => {
      if (a.status === "saved") return false;
      const d = daysBetween(a.applied_at, today);
      return d >= w * 7 && d < (w + 1) * 7;
    }).length,
  }));
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  if (applications.length === 0) {
    return <p className="rounded-[10px] bg-card p-12 text-center text-muted">Stats appear once you add applications.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
        <Tile label="Sent" value={String(all.total - all.byStatus.saved)} />
        <Tile label="Reply rate" value={pct(all.responseRate)} />
        <Tile label="Interview rate" value={pct(all.interviewRate)} />
        <Tile label="Offers" value={String(all.byStatus.offer)} />
      </section>

      <section className="rounded-[10px] bg-card p-6">
        <h2 className="mono mb-4 text-[13px]">Where everything stands</h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface">
          {STATUSES.map((s) =>
            all.byStatus[s] ? (
              <div
                key={s}
                className={STATUS_META[s].dot}
                style={{ width: `${(all.byStatus[s] / all.total) * 100}%` }}
                title={`${STATUS_META[s].label}: ${all.byStatus[s]}`}
              />
            ) : null,
          )}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${STATUS_META[s].dot}`} aria-hidden />
              {STATUS_META[s].label} <b className="tabular-nums">{all.byStatus[s]}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[10px] bg-card p-6">
        <h2 className="mono mb-4 text-[13px]">Applications sent per week</h2>
        <div className="flex h-32 items-end gap-2">
          {weeks.map((w) => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-muted">{w.count || ""}</span>
              <div className="w-full rounded-t-[4px] bg-ink" style={{ height: `${(w.count / maxWeek) * 96}px` }} />
              <span className="text-[10px] text-muted">{w.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[10px] bg-card p-6 lg:col-span-2">
        <h2 className="mono mb-1 text-[13px]">Which CV works best?</h2>
        <p className="mb-3 text-sm text-muted">
          {best
            ? `${best.cv?.name} gets you to interview most often (${pct(best.interviewRate)}).`
            : "Send at least 3 applications with a CV to compare them."}
        </p>
        {perCv.length === 0 ? (
          <p className="text-sm text-muted">No applications are linked to a CV yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="mono text-left text-[11px] text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">CV</th>
                  <th className="py-2 pr-3 font-medium">Sent</th>
                  {STATUSES.slice(2).map((s) => (
                    <th key={s} className="py-2 pr-3 font-medium">{STATUS_META[s].label}</th>
                  ))}
                  <th className="w-1/3 py-2 font-medium">Interview rate</th>
                </tr>
              </thead>
              <tbody>
                {perCv.map((s) => (
                  <tr key={s.cv!.id} className="border-t border-line">
                    <td className="py-2 pr-3 font-medium">{s.cv!.name}</td>
                    <td className="py-2 pr-3 tabular-nums">{s.total - s.byStatus.saved}</td>
                    {STATUSES.slice(2).map((st) => (
                      <td key={st} className="py-2 pr-3 tabular-nums">{s.byStatus[st]}</td>
                    ))}
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-surface">
                          <div className="h-2 rounded-full bg-amber-500" style={{ width: pct(s.interviewRate) }} />
                        </div>
                        <span className="w-10 text-right tabular-nums">{pct(s.interviewRate)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-card p-6">
      <p className="font-mono text-[36px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mono mt-1.5 text-[13px] text-muted">{label}</p>
    </div>
  );
}
