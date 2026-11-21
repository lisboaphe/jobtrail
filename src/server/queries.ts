/**
 * READING DATA: functions that load data from the database.
 * Only runs on the server; the browser never talks to the database directly.
 */
import "server-only";
import { db } from "./database";
import type { Application, Cv, TimelineEvent, TrackerData } from "@/lib/types";

export function getTrackerData(): TrackerData {
  const d = db();
  const cvs = d
    .prepare("SELECT id, name, notes, file_name, file_type, created_at FROM cvs ORDER BY id")
    .all() as unknown as Cv[];
  const applications = d
    .prepare("SELECT * FROM applications ORDER BY applied_at DESC, id DESC")
    .all() as unknown as Application[];
  const events = d
    .prepare("SELECT * FROM events ORDER BY at ASC, id ASC")
    .all() as unknown as TimelineEvent[];
  const today = new Date().toISOString().slice(0, 10);
  // Spread into plain objects: node:sqlite rows have a null prototype,
  // which React can't pass to Client Components.
  return {
    cvs: cvs.map((r) => ({ ...r })),
    applications: applications.map((r) => ({ ...r })),
    events: events.map((r) => ({ ...r })),
    today,
  };
}

export function getCvFile(id: number) {
  return db()
    .prepare("SELECT file_name, file_path, file_type FROM cvs WHERE id = ?")
    .get(id) as { file_name: string | null; file_path: string | null; file_type: string | null } | undefined;
}
