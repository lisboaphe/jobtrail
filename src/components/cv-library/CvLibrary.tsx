/**
 * CV LIBRARY: one card per CV version.
 * Each card has five colored folders showing which companies that CV went to
 * and what happened, plus its reply and interview rates.
 * Also contains the form for adding or editing a CV.
 */
"use client";

import { useState, useTransition } from "react";
import type { Application, Cv, TimelineEvent } from "@/lib/types";
import { STATUSES, STATUS_META } from "@/lib/statuses";
import { pct, statsFor } from "@/lib/calculations";
import { deleteCv, saveCv } from "@/server/actions";

type Props = {
  cvs: Cv[];
  applications: Application[];
  events: TimelineEvent[];
  onOpen: (id: number) => void;
};

export default function CvLibrary({ cvs, applications, events, onOpen }: Props) {
  const [editing, setEditing] = useState<number | "new" | null>(cvs.length === 0 ? "new" : null);
  const unassigned = applications.filter((a) => a.cv_id === null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Each CV has its own colored folders, so you can see where it was sent and what happened.
        </p>
        {editing !== "new" && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            ＋ Add CV
          </button>
        )}
      </div>

      {editing === "new" && <CvForm onDone={() => setEditing(null)} />}

      {cvs.map((cv) =>
        editing === cv.id ? (
          <CvForm key={cv.id} cv={cv} onDone={() => setEditing(null)} />
        ) : (
          <CvCard
            key={cv.id}
            cv={cv}
            applications={applications.filter((a) => a.cv_id === cv.id)}
            stats={statsFor(cv, applications, events)}
            onEdit={() => setEditing(cv.id)}
            onOpen={onOpen}
          />
        ),
      )}

      {unassigned.length > 0 && (
        <CvCard
          cv={null}
          applications={unassigned}
          stats={statsFor(null, applications, events)}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}

function CvCard({
  cv,
  applications,
  stats,
  onEdit,
  onOpen,
}: {
  cv: Cv | null;
  applications: Application[];
  stats: ReturnType<typeof statsFor>;
  onEdit?: () => void;
  onOpen: (id: number) => void;
}) {
  return (
    <article className="rounded-[10px] bg-card p-5">
      <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="mr-auto min-w-0">
          <h2 className="truncate text-[22px] font-medium tracking-[-0.02em]">{cv ? cv.name : "Sent without a CV attached"}</h2>
          {cv?.notes && <p className="text-sm text-muted">{cv.notes}</p>}
        </div>
        <div className="flex gap-6 text-sm">
          <Metric label="Sent" value={String(stats.total - stats.byStatus.saved)} />
          <Metric label="Replies" value={pct(stats.responseRate)} />
          <Metric label="Interviews" value={pct(stats.interviewRate)} />
        </div>
        {cv && (
          <div className="flex gap-2">
            {cv.file_name && (
              <a className="btn btn-ghost" href={`/api/cv/${cv.id}`} target="_blank" rel="noopener">
                Open file
              </a>
            )}
            <button className="btn btn-ghost" onClick={onEdit}>
              Edit
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const items = applications.filter((a) => a.status === s);
          return (
            <div key={s} className={`rounded-[6px] border-t-[3px] bg-surface p-2 ${meta.bar}`}>
              <p className="mono mb-1.5 flex items-center gap-1.5 px-1 text-[11px]">
                <span aria-hidden>📁</span>
                {meta.label}
                <span className="ml-auto text-muted">{items.length}</span>
              </p>
              <ul className="flex flex-col gap-1">
                {items.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => onOpen(a.id)}
                      className="flex w-full items-center gap-1.5 truncate rounded-[4px] bg-card px-2 py-1 text-left text-sm transition hover:opacity-70"
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
                      <span className="truncate">{a.company}</span>
                    </button>
                  </li>
                ))}
                {items.length === 0 && <li className="px-1 text-xs text-muted">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="font-mono text-xl font-medium tabular-nums">{value}</p>
      <p className="mono text-[11px] text-muted">{label}</p>
    </div>
  );
}

function CvForm({ cv, onDone }: { cv?: Cv; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(form) =>
        startTransition(async () => {
          const res = await saveCv(form);
          if (res?.error) setError(res.error);
          else onDone();
        })
      }
      className="grid gap-4 rounded-[10px] bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
    >
      {cv && <input type="hidden" name="id" value={cv.id} />}
      <label className="mono flex flex-col gap-1.5 text-[11px] text-muted">
        Name *
        <input name="name" required defaultValue={cv?.name} className="field font-sans normal-case" placeholder="CV1 – Frontend" autoFocus />
      </label>
      <label className="mono flex flex-col gap-1.5 text-[11px] text-muted">
        What makes this version different?
        <input name="notes" defaultValue={cv?.notes} className="field font-sans normal-case" placeholder="Focus on React projects" />
      </label>
      <label className="mono flex flex-col gap-1.5 text-[11px] text-muted">
        {cv?.file_name ? `Replace file (${cv.file_name})` : "File (PDF, max 10 MB)"}
        <input
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.odt,.txt"
          className="font-sans text-sm normal-case text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-ink file:px-2 file:py-1.5 file:font-mono file:text-xs file:uppercase file:text-ink-fg"
        />
      </label>
      {error && <p className="text-sm text-rose-600 sm:col-span-3">{error}</p>}
      <div className="flex gap-2 sm:col-span-3">
        {cv && (
          <button
            type="button"
            className="btn text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            onClick={() => {
              if (!confirm(`Delete “${cv.name}”? Applications that used it stay, but lose the link to this CV.`)) return;
              startTransition(async () => {
                await deleteCv(cv.id);
                onDone();
              });
            }}
          >
            Delete CV
          </button>
        )}
        <button type="button" className="btn btn-ghost ml-auto" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : cv ? "Save" : "Add CV"}
        </button>
      </div>
    </form>
  );
}
