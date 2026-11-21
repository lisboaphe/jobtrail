/**
 * JOBTRAIL APP: the main screen.
 * Draws the top navigation, the page heading and the follow-up reminders,
 * then shows one of three views: Board, CVs or Insights.
 * It also opens the side panel when you click an application.
 */
"use client";

import { useMemo, useOptimistic, useState, startTransition } from "react";
import type { Application, Status, TrackerData } from "@/lib/types";
import { needsFollowUp } from "@/lib/calculations";
import { markFollowedUp, moveApplication } from "@/server/actions";
import Board from "./board/Board";
import ApplicationPanel from "./application/ApplicationPanel";
import CvLibrary from "./cv-library/CvLibrary";
import Insights from "./insights/Insights";
import ThemeToggle from "./ui/ThemeToggle";

type Tab = "board" | "cvs" | "stats";
type DialogState = { mode: "new" } | { mode: "edit"; id: number } | null;

const TABS = [
  ["board", "Board"],
  ["cvs", "CVs"],
  ["stats", "Stats"],
] as const;

const HEADINGS: Record<Tab, { kicker: string; title: string }> = {
  board: { kicker: "Applications", title: "Where every application stands" },
  cvs: { kicker: "CV library", title: "Which CV went where" },
  stats: { kicker: "Insights", title: "How your search is going" },
};

export default function JobtrailApp({ data }: { data: TrackerData }) {
  const { cvs, events, today } = data;
  const [tab, setTab] = useState<Tab>("board");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState("");
  const [cvFilter, setCvFilter] = useState<string>("all");

  const [applications, applyMove] = useOptimistic(
    data.applications,
    (state: Application[], move: { id: number; status: Status }) =>
      state.map((a) => (a.id === move.id ? { ...a, status: move.status } : a)),
  );

  const move = (id: number, status: Status) =>
    startTransition(async () => {
      applyMove({ id, status });
      await moveApplication(id, status);
    });

  const changeTab = (t: Tab) => setTab(t);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (cvFilter === "none" && a.cv_id !== null) return false;
      if (cvFilter !== "all" && cvFilter !== "none" && a.cv_id !== Number(cvFilter)) return false;
      if (!q) return true;
      return [a.company, a.role, a.location, a.source, a.notes, a.contact]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [applications, query, cvFilter]);

  const followUps = applications
    .map((a) => ({ app: a, days: needsFollowUp(a, events, today) }))
    .filter((x): x is { app: Application; days: number } => x.days !== null)
    .sort((a, b) => b.days - a.days);

  const sent = applications.filter((a) => a.status !== "saved").length;
  const interviewing = applications.filter((a) => a.status === "interview").length;
  const offers = applications.filter((a) => a.status === "offer").length;

  const editing = dialog?.mode === "edit" ? applications.find((a) => a.id === dialog.id) : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <nav
        className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur-md"
        aria-label="Main"
      >
        <div className="mx-auto flex h-[60px] max-w-[1240px] items-center gap-6 px-[30px]">
          <span className="text-xl font-medium tracking-[-0.02em]">
            Jobtrail
          </span>
          <div className="hidden gap-8 sm:flex">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={`text-sm transition hover:opacity-60 ${tab === key ? "font-medium" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="mono hidden items-center gap-2 text-[13px] md:inline-flex">
              <span className="size-2 rounded-full bg-green-500" aria-hidden />
              {sent} sent
            </span>
            <ThemeToggle />
          </div>
        </div>
        {/* Tabs on small screens */}
        <div className="flex gap-6 px-[30px] pb-3 sm:hidden">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => changeTab(key)}
              className={`text-sm ${tab === key ? "font-medium" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1240px] flex-1 px-[30px] pb-20">
        <header className="flex flex-wrap items-end gap-4 pb-8 pt-14">
          <div className="mr-auto grid justify-items-start gap-4">
            <span className="pill">{HEADINGS[tab].kicker}</span>
            <div>
              <h1 className="text-[32px] font-medium leading-tight tracking-[-0.02em]">{HEADINGS[tab].title}</h1>
              <p className="mt-1 text-muted">
                {sent} sent · {interviewing} interviewing · {offers} {offers === 1 ? "offer" : "offers"}
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setDialog({ mode: "new" })}>
            New application
          </button>
        </header>

      {followUps.length > 0 && tab === "board" && (
        <section className="mb-6 rounded-[10px] bg-card p-2">
          <h2 className="mono flex items-center gap-2 px-3 pb-2 pt-2 text-[13px]">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            Time to follow up ({followUps.length})
          </h2>
          <ul className="grid">
            {followUps.map(({ app, days }) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2.5 text-sm first:border-t-0"
              >
                <button className="font-medium hover:opacity-60" onClick={() => setDialog({ mode: "edit", id: app.id })}>
                  {app.company}
                </button>
                <span className="text-muted">no reply for {days} days</span>
                <button
                  className="mono ml-auto text-xs underline-offset-4 hover:underline"
                  onClick={() => startTransition(() => markFollowedUp(app.id))}
                  title="Logs a follow-up and resets the timer"
                >
                  Mark followed up →
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "board" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className="field max-w-xs"
              placeholder="Search company, role, notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search applications"
            />
            <select
              className="field w-auto"
              value={cvFilter}
              onChange={(e) => setCvFilter(e.target.value)}
              aria-label="Filter by CV"
            >
              <option value="all">All CVs</option>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
              <option value="none">No CV attached</option>
            </select>
          </div>
          <Board
            applications={filtered}
            cvs={cvs}
            events={events}
            today={today}
            onMove={move}
            onOpen={(id) => setDialog({ mode: "edit", id })}
            empty={applications.length === 0}
            onNew={() => setDialog({ mode: "new" })}
          />
        </>
      )}

      {tab === "cvs" && (
        <CvLibrary cvs={cvs} applications={applications} events={events} onOpen={(id) => setDialog({ mode: "edit", id })} />
      )}

      {tab === "stats" && <Insights cvs={cvs} applications={applications} events={events} today={today} />}
      </main>

      {dialog && (dialog.mode === "new" || editing) && (
        <ApplicationPanel
          key={dialog.mode === "edit" ? dialog.id : "new"}
          application={editing}
          cvs={cvs}
          events={events}
          today={today}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
