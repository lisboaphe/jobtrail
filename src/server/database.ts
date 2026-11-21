/**
 * DATABASE: where all your data is stored.
 * Uses SQLite, a database that is just one file: data/tracker.db.
 * Uploaded CV files are saved in data/uploads/.
 *
 * There are three tables:
 *   cvs           – each CV version you have (CV1, CV2, …)
 *   applications  – each job you applied to, and which CV you sent
 *   events        – the history of each application (status changes, notes)
 */
import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const globalForDb = globalThis as unknown as { __trackerDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "tracker.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS cvs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      notes       TEXT NOT NULL DEFAULT '',
      file_name   TEXT,
      file_path   TEXT,
      file_type   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      company         TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT '',
      status          TEXT NOT NULL DEFAULT 'applied',
      cv_id           INTEGER REFERENCES cvs(id) ON DELETE SET NULL,
      source          TEXT NOT NULL DEFAULT '',
      url             TEXT NOT NULL DEFAULT '',
      location        TEXT NOT NULL DEFAULT '',
      salary          TEXT NOT NULL DEFAULT '',
      contact         TEXT NOT NULL DEFAULT '',
      notes           TEXT NOT NULL DEFAULT '',
      applied_at      TEXT NOT NULL DEFAULT (date('now')),
      follow_up_days  INTEGER NOT NULL DEFAULT 7,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      status          TEXT,
      note            TEXT NOT NULL DEFAULT '',
      at              TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export function db(): DatabaseSync {
  if (!globalForDb.__trackerDb) globalForDb.__trackerDb = open();
  return globalForDb.__trackerDb;
}
