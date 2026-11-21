/**
 * APPLICATION PANEL: the side panel for adding or editing one application.
 * Contains the form (company, role, CV sent, dates, link, notes…) and,
 * for existing applications, the timeline of everything that happened.
 */
"use client";

import { useEffect, useState, useTransition } from "react";
import type { Application, Cv, TimelineEvent } from "@/lib/types";
import { STATUSES, STATUS_META } from "@/lib/statuses";
import { useActions } from "../actions-context";

type Props = {
  application?: Application;
  cvs: Cv[];
  events: TimelineEvent[];
  today: string;
  onClose: () => void;
};

export default function ApplicationPanel({ application: a, cvs, events, today, onClose }: Props) {
  const { addNote, deleteApplication, saveApplication } = useActions();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const timeline = a ? events.filter((e) => e.application_id === a.id).reverse() : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (form: FormData) =>
    startTransition(async () => {
      const res = await saveApplication(form);
      if (res?.error) setError(res.error);
      else onClose();
    });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={a ? `Edit ${a.company}` : "New application"}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-background/95 px-6 backdrop-blur-md">
          {a && <span className={`size-3 rounded-full ${STATUS_META[a.status].dot}`} aria-hidden />}
          <h2 className="mr-auto text-xl font-medium tracking-[-0.02em]">{a ? a.company : "New application"}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form action={submit} className="m-4 grid grid-cols-2 gap-4 rounded-[10px] bg-card p-5">
          {a && <input type="hidden" name="id" value={a.id} />}
          <Field label="Company *" className="col-span-2">
            <input name="company" required defaultValue={a?.company} className="field" autoFocus={!a} />
          </Field>
          <Field label="Role">
            <input name="role" defaultValue={a?.role} className="field" placeholder="Frontend Developer" />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={a?.status ?? "applied"} className="field">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="CV sent">
            <select name="cv_id" defaultValue={a?.cv_id ?? ""} className="field">
              <option value="">— none —</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Applied on">
            <input type="date" name="applied_at" defaultValue={a?.applied_at ?? today} className="field" />
          </Field>
          <Field label="Applied via">
            <input
              name="source"
              defaultValue={a?.source}
              className="field"
              placeholder="LinkedIn, company site…"
              list="sources"
            />
            <datalist id="sources">
              {["LinkedIn", "Company website", "Indeed", "StepStone", "Referral", "Email", "Recruiter"].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Follow up after (days)">
            <input
              type="number"
              min={1}
              max={90}
              name="follow_up_days"
              defaultValue={a?.follow_up_days ?? 7}
              className="field"
            />
          </Field>
          <Field label="Location">
            <input name="location" defaultValue={a?.location} className="field" placeholder="Remote, Berlin…" />
          </Field>
          <Field label="Salary">
            <input name="salary" defaultValue={a?.salary} className="field" placeholder="e.g. 55–65k" />
          </Field>
          <Field label="Job posting link" className="col-span-2">
            <div className="flex gap-2">
              <input name="url" type="url" defaultValue={a?.url} className="field" placeholder="https://…" />
              {a?.url && /^https?:\/\//.test(a.url) && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost shrink-0">
                  Open ↗
                </a>
              )}
            </div>
          </Field>
          <Field label="Contact person" className="col-span-2">
            <input name="contact" defaultValue={a?.contact} className="field" placeholder="Name, email or LinkedIn" />
          </Field>
          <Field label="Notes" className="col-span-2">
            <textarea
              name="notes"
              rows={4}
              defaultValue={a?.notes}
              className="field"
              placeholder="Paste the job description, requirements, anything worth remembering…"
            />
          </Field>

          {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}

          <div className="col-span-2 flex items-center gap-2 pt-1">
            {a && (
              <button
                type="button"
                className="btn text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete the application to ${a.company}? This can't be undone.`)) return;
                  startTransition(async () => {
                    await deleteApplication(a.id);
                    onClose();
                  });
                }}
              >
                Delete
              </button>
            )}
            <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : a ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>

        {a && (
          <section className="mx-4 mb-4 rounded-[10px] bg-card p-5">
            <h3 className="mono mb-4 text-[13px]">Timeline</h3>
            <form
              className="mb-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                const text = note;
                setNote("");
                startTransition(() => addNote(a.id, text));
              }}
            >
              <input
                className="field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an update, e.g. “Phone screen with Anna on Friday”"
              />
              <button className="btn btn-ghost shrink-0" disabled={pending || !note.trim()}>
                Add
              </button>
            </form>
            <ol className="relative ml-1.5 border-l border-line">
              {timeline.map((e) => (
                <li key={e.id} className="mb-3 ml-4">
                  <span
                    className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-4 ring-card ${
                      e.status ? STATUS_META[e.status].dot : "bg-muted"
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm">
                    {e.status ? (
                      <>
                        Moved to <b>{STATUS_META[e.status].label}</b>
                      </>
                    ) : (
                      e.note
                    )}
                  </p>
                  <time className="text-xs text-muted">{formatWhen(e.at)}</time>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`mono flex flex-col gap-1.5 text-[11px] text-muted ${className}`}>
      {label}
      <span className="font-sans normal-case text-foreground">{children}</span>
    </label>
  );
}

function formatWhen(at: string) {
  const d = new Date(at.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return at;
  const dateOnly = at.endsWith("00:00:00");
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : { hour: "2-digit", minute: "2-digit" }),
  });
}
