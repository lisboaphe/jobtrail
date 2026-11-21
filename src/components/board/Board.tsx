/**
 * BOARD: the five colored columns (Saved, Applied, Interview, Offer, Rejected).
 * Drag a card to another column when a company replies.
 * On phones, where dragging doesn't work, each card has a "Move to" menu instead.
 */
"use client";

import { useState } from "react";
import type { Application, Cv, Status, TimelineEvent } from "@/lib/types";
import { STATUSES, STATUS_META } from "@/lib/statuses";
import { daysBetween, needsFollowUp, relativeDays } from "@/lib/calculations";

type Props = {
  applications: Application[];
  cvs: Cv[];
  events: TimelineEvent[];
  today: string;
  onMove: (id: number, status: Status) => void;
  onOpen: (id: number) => void;
  empty: boolean;
  onNew: () => void;
};

export default function Board({ applications, cvs, events, today, onMove, onOpen, empty, onNew }: Props) {
  const [over, setOver] = useState<Status | null>(null);
  const cvName = (id: number | null) => cvs.find((c) => c.id === id)?.name;

  if (empty) {
    return (
      <div className="rounded-[10px] bg-card px-6 py-16 text-center">
        <p className="text-[22px] font-medium tracking-[-0.02em]">No applications yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Add your CVs in the <b>CVs</b> tab, then log each place you apply. Drag cards between the colored
          columns when a company replies.
        </p>
        <button className="btn btn-primary mt-6" onClick={onNew}>
          Add your first application
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {STATUSES.map((status) => {
        const meta = STATUS_META[status];
        const items = applications.filter((a) => a.status === status);
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = Number(e.dataTransfer.getData("text/plain"));
              if (id) onMove(id, status);
            }}
            className={`flex min-h-40 flex-col rounded-[10px] border-t-[3px] bg-card p-2 transition ${meta.bar} ${
              over === status ? `outline-2 outline-offset-2 ${meta.ring}` : ""
            }`}
          >
            <h2 className="mono flex items-center gap-2 px-2 pb-2.5 pt-1.5 text-[13px]">
              <span className={`size-2.5 rounded-full ${meta.dot}`} aria-hidden />
              {meta.label}
              <span className="ml-auto text-muted">
                {items.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((a) => {
                const follow = needsFollowUp(a, events, today);
                const cv = cvName(a.cv_id);
                return (
                  <li
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(a.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group cursor-grab rounded-[6px] bg-surface p-3 shadow-[0_1px_2px_#0000000d] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_#00000014] active:cursor-grabbing"
                  >
                    <button className="block w-full text-left" onClick={() => onOpen(a.id)}>
                      <div className="flex items-start gap-2">
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.company}</p>
                          {a.role && <p className="truncate text-sm text-muted">{a.role}</p>}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        {cv && (
                          <span className="max-w-full truncate rounded-[4px] border border-line px-1.5 py-px">{cv}</span>
                        )}
                        {a.source && <span className="rounded-[4px] bg-card px-1.5 py-px text-muted">{a.source}</span>}
                        {follow !== null && (
                          <span className="mono rounded-[4px] bg-amber-500/15 px-1.5 py-px text-[11px] text-amber-700 dark:text-amber-300">
                            follow up
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Applied {relativeDays(daysBetween(a.applied_at, today))}
                      </p>
                    </button>
                    {/* Fallback for touch screens, where drag-and-drop isn't available */}
                    <select
                      aria-label={`Move ${a.company} to`}
                      className="mt-2 w-full rounded-[4px] border border-line bg-card px-2 py-1 text-xs lg:hidden"
                      value={a.status}
                      onChange={(e) => onMove(a.id, e.target.value as Status)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Move to: {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="mono rounded-[6px] border border-dashed border-line px-3 py-6 text-center text-[11px] text-muted">
                  Drop here
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
