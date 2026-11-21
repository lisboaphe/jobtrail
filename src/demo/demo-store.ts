/**
 * DEMO STORE: the "database" of the online demo (GitHub Pages).
 *
 * GitHub Pages can only host plain files, so the demo has no server. Instead,
 * everything is kept in the visitor's own browser (localStorage). It starts
 * with made-up sample data, and "Reset demo" puts that sample data back.
 *
 * It offers the same save functions as the real server (see actions-context.tsx),
 * so the screens work without knowing they are in the demo.
 */
import type { TrackerActions } from "@/components/actions-context";
import { isStatus } from "@/lib/statuses";
import type { Application, Cv, Status, TimelineEvent, TrackerData } from "@/lib/types";

const STORAGE_KEY = "jobtrail-demo-v1";
const MAX_DEMO_FILE_BYTES = 2 * 1024 * 1024; // browser storage is small, so demo files are capped at 2 MB

type StoredCv = Omit<Cv, "file_url"> & { file_data: string | null };
type State = { cvs: StoredCv[]; applications: Application[]; events: TimelineEvent[]; nextId: number };

/* ----------------------------- Date helpers ----------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}
/** Same format the real database uses: "2026-11-21 14:05:00" (UTC). */
function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/* ------------------------------ Sample data ----------------------------- */
// All companies below are invented for the demo.

function sampleState(): State {
  const cvs: StoredCv[] = [
    { id: 1, name: "CV1 – Frontend", notes: "Focus on React and web projects", file_name: null, file_type: null, file_data: null, created_at: nowStamp() },
    { id: 2, name: "CV2 – Cybersecurity", notes: "Focus on Linux, networking and security labs", file_name: null, file_type: null, file_data: null, created_at: nowStamp() },
  ];

  // [company, role, cv, source, applied days ago, history of [status, days ago]]
  const rows: [string, string, number | null, string, number, [Status, number][], Partial<Application>?][] = [
    ["Northwind Labs", "Junior Frontend Developer", 1, "LinkedIn", 24, [["applied", 24], ["rejected", 15]]],
    ["Bluefin Systems", "Web Developer (React)", 1, "Company website", 20, [["applied", 20], ["interview", 12], ["offer", 3]], { salary: "48–55k", location: "Hybrid" }],
    ["Halcyon Security", "SOC Analyst Trainee", 2, "Referral", 16, [["applied", 16], ["interview", 6]], { contact: "Recruiter: Mara K." }],
    ["Copperleaf", "Frontend Engineer", 1, "Indeed", 13, [["applied", 13]]],
    ["Meridian Health IT", "IT Security Intern", 2, "StepStone", 11, [["applied", 11], ["rejected", 4]]],
    ["Pixelforge Studio", "UI Developer", 1, "LinkedIn", 9, [["applied", 9]]],
    ["Vantage Cloud", "Junior Cloud Engineer", 2, "Company website", 5, [["applied", 5]], { location: "Remote" }],
    ["Lumen Analytics", "Working Student – Web", 1, "Email", 2, [["applied", 2]]],
    ["Orbit Mobility", "Junior Fullstack Developer", null, "", 0, [["saved", 0]], { notes: "Deadline end of the month. Ask about remote days." }],
  ];

  const applications: Application[] = [];
  const events: TimelineEvent[] = [];
  let eventId = 1;
  rows.forEach(([company, role, cv, source, applied, history, extra], i) => {
    const id = i + 1;
    applications.push({
      id, company, role, cv_id: cv, source,
      status: history[history.length - 1][0],
      url: "", location: "", salary: "", contact: "", notes: "",
      applied_at: daysAgo(applied), follow_up_days: 7,
      created_at: nowStamp(), updated_at: nowStamp(),
      ...extra,
    });
    for (const [status, ago] of history) {
      events.push({ id: eventId++, application_id: id, status, note: "", at: `${daysAgo(ago)} 00:00:00` });
    }
  });
  events.push({ id: eventId++, application_id: 3, status: null, note: "Phone screen went well — technical interview next week", at: `${daysAgo(6)} 10:30:00` });

  return { cvs, applications, events, nextId: 100 };
}

/* ------------------------- Loading and saving --------------------------- */

let state: State | null = null;
let snapshot: TrackerData | null = null;
const listeners = new Set<() => void>();
const fileUrls = new Map<string, string>(); // file data → blob: link, so files can be opened

function load(): State {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as State;
  } catch {}
  if (!state) state = sampleState();
  return state;
}

function fileUrl(data: string | null): string | null {
  if (!data) return null;
  let url = fileUrls.get(data);
  if (!url) {
    const [head, body] = data.split(",");
    const type = head.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    url = URL.createObjectURL(new Blob([bytes], { type }));
    fileUrls.set(data, url);
  }
  return url;
}

/** Saves to the browser, rebuilds what the screens see, and tells them to redraw. */
function commit(next: State) {
  state = next;
  snapshot = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (e.g. private window): the demo still works until the tab closes.
  }
  listeners.forEach((l) => l());
}

/* --------------- Hooks for React (useSyncExternalStore) ----------------- */

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): TrackerData {
  if (!snapshot) {
    const s = load();
    snapshot = {
      cvs: s.cvs.map(({ file_data, ...cv }) => ({ ...cv, file_url: fileUrl(file_data) })),
      applications: [...s.applications].sort((a, b) => b.applied_at.localeCompare(a.applied_at) || b.id - a.id),
      events: [...s.events].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id),
      today: isoDate(new Date()),
    };
  }
  return snapshot;
}

/** During the build there is no browser storage, so the page shows "Loading…" first. */
export function getServerSnapshot(): TrackerData | null {
  return null;
}

export function resetDemo() {
  commit(sampleState());
}

/* ---------------------- The demo's save functions ----------------------- */

function text(form: FormData, key: string, max = 2000) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function idFrom(form: FormData, key: string) {
  const n = Number(text(form, key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function withEvent(s: State, application_id: number, status: Status | null, note = ""): State {
  return {
    ...s,
    nextId: s.nextId + 1,
    events: [...s.events, { id: s.nextId, application_id, status, note, at: nowStamp() }],
  };
}

function touch(s: State, id: number, patch: Partial<Application> = {}): State {
  return {
    ...s,
    applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch, updated_at: nowStamp() } : a)),
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export const demoActions: TrackerActions = {
  async saveApplication(form) {
    const company = text(form, "company", 200);
    if (!company) return { error: "Company is required." };
    const statusRaw = text(form, "status");
    const status: Status = isStatus(statusRaw) ? statusRaw : "applied";
    const date = text(form, "applied_at");
    const fields = {
      company,
      role: text(form, "role", 200),
      status,
      cv_id: idFrom(form, "cv_id"),
      source: text(form, "source", 200),
      url: text(form, "url", 1000),
      location: text(form, "location", 200),
      salary: text(form, "salary", 200),
      contact: text(form, "contact", 500),
      notes: text(form, "notes", 10000),
      applied_at: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoDate(new Date()),
      follow_up_days: Math.min(Math.max(Number(text(form, "follow_up_days")) || 7, 1), 90),
    };

    let s = load();
    const id = idFrom(form, "id");
    if (id) {
      const prev = s.applications.find((a) => a.id === id);
      if (!prev) return { error: "Application not found." };
      s = touch(s, id, fields);
      if (prev.status !== status) s = withEvent(s, id, status);
    } else {
      const newId = s.nextId;
      s = {
        ...s,
        nextId: newId + 2,
        applications: [...s.applications, { id: newId, ...fields, created_at: nowStamp(), updated_at: nowStamp() }],
        events: [...s.events, { id: newId + 1, application_id: newId, status, note: "", at: `${fields.applied_at} 00:00:00` }],
      };
    }
    commit(s);
    return { ok: true };
  },

  async moveApplication(id, status) {
    const s = load();
    const prev = s.applications.find((a) => a.id === id);
    if (!prev || !isStatus(status) || prev.status === status) return;
    commit(withEvent(touch(s, id, { status }), id, status));
  },

  async addNote(id, note) {
    const t = note.trim().slice(0, 5000);
    if (!t) return;
    commit(withEvent(touch(load(), id), id, null, t));
  },

  async markFollowedUp(id) {
    commit(withEvent(touch(load(), id), id, null, "Followed up"));
  },

  async deleteApplication(id) {
    const s = load();
    commit({
      ...s,
      applications: s.applications.filter((a) => a.id !== id),
      events: s.events.filter((e) => e.application_id !== id),
    });
  },

  async saveCv(form) {
    const name = text(form, "name", 120);
    if (!name) return { error: "Give the CV a name, e.g. “CV1 – Frontend”." };
    const notes = text(form, "notes", 2000);

    let file: Pick<StoredCv, "file_name" | "file_type" | "file_data"> | null = null;
    const f = form.get("file");
    if (f instanceof File && f.size > 0) {
      if (f.size > MAX_DEMO_FILE_BYTES) return { error: "In the demo, files can be at most 2 MB." };
      file = { file_name: f.name.slice(0, 200), file_type: f.type || "application/octet-stream", file_data: await readFile(f) };
    }

    const s = load();
    const id = idFrom(form, "id");
    if (id) {
      commit({ ...s, cvs: s.cvs.map((c) => (c.id === id ? { ...c, name, notes, ...(file ?? {}) } : c)) });
    } else {
      const cv: StoredCv = {
        id: s.nextId, name, notes,
        file_name: file?.file_name ?? null, file_type: file?.file_type ?? null, file_data: file?.file_data ?? null,
        created_at: nowStamp(),
      };
      commit({ ...s, nextId: s.nextId + 1, cvs: [...s.cvs, cv] });
    }
    return { ok: true };
  },

  async deleteCv(id) {
    const s = load();
    commit({
      ...s,
      cvs: s.cvs.filter((c) => c.id !== id),
      applications: s.applications.map((a) => (a.cv_id === id ? { ...a, cv_id: null } : a)),
    });
  },
};
