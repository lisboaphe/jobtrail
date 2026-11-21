/**
 * SAVING DATA: everything that changes the database.
 * Each function here is called from a button or form in the app
 * (add an application, move it to another column, upload a CV, …).
 * After saving, refresh() tells the page to reload the latest data.
 *
 * Every input is checked here, because anything sent from a browser
 * could have been changed by someone.
 */
"use server";

import { refresh } from "next/cache";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, UPLOAD_DIR } from "@/server/database";
import type { Status } from "@/lib/types";
import { isStatus } from "@/lib/statuses";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Reads a text field from a form, trimmed and cut to a maximum length. */
function str(form: FormData, key: string, max = 2000): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Reads a positive whole number (an id) from a form, or null if there is none. */
function optionalId(form: FormData, key: string): number | null {
  const n = Number(str(form, key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Keeps a date only if it looks like 2026-11-21; otherwise uses today. */
function validDate(v: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10);
}

function done() {
  refresh();
}

/* ---------------------------- Applications ---------------------------- */

/**
 * Adds a new application, or updates an existing one when the form includes an id.
 * If the status changed, that change is written to the timeline.
 */
export async function saveApplication(form: FormData) {
  const id = optionalId(form, "id");
  const company = str(form, "company", 200);
  if (!company) return { error: "Company is required." };

  const statusRaw = str(form, "status");
  const status: Status = isStatus(statusRaw) ? statusRaw : "applied";
  const followUp = Math.min(Math.max(Number(str(form, "follow_up_days")) || 7, 1), 90);

  const fields = {
    company,
    role: str(form, "role", 200),
    status,
    cv_id: optionalId(form, "cv_id"),
    source: str(form, "source", 200),
    url: str(form, "url", 1000),
    location: str(form, "location", 200),
    salary: str(form, "salary", 200),
    contact: str(form, "contact", 500),
    notes: str(form, "notes", 10000),
    applied_at: validDate(str(form, "applied_at")),
    follow_up_days: followUp,
  };

  const d = db();
  if (id) {
    const prev = d.prepare("SELECT status FROM applications WHERE id = ?").get(id) as
      | { status: Status }
      | undefined;
    if (!prev) return { error: "Application not found." };
    d.prepare(
      `UPDATE applications SET company=?, role=?, status=?, cv_id=?, source=?, url=?, location=?,
       salary=?, contact=?, notes=?, applied_at=?, follow_up_days=?, updated_at=datetime('now') WHERE id=?`,
    ).run(
      fields.company, fields.role, fields.status, fields.cv_id, fields.source, fields.url,
      fields.location, fields.salary, fields.contact, fields.notes, fields.applied_at,
      fields.follow_up_days, id,
    );
    if (prev.status !== status) {
      d.prepare("INSERT INTO events (application_id, status) VALUES (?, ?)").run(id, status);
    }
  } else {
    const res = d
      .prepare(
        `INSERT INTO applications (company, role, status, cv_id, source, url, location, salary,
         contact, notes, applied_at, follow_up_days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        fields.company, fields.role, fields.status, fields.cv_id, fields.source, fields.url,
        fields.location, fields.salary, fields.contact, fields.notes, fields.applied_at,
        fields.follow_up_days,
      );
    d.prepare("INSERT INTO events (application_id, status, at) VALUES (?, ?, ?)").run(
      Number(res.lastInsertRowid),
      status,
      `${fields.applied_at} 00:00:00`,
    );
  }
  done();
  return { ok: true };
}

/**
 * Moves an application to another column (e.g. Applied → Rejected) and logs it in the timeline.
 */
export async function moveApplication(id: number, status: string) {
  if (!Number.isInteger(id) || !isStatus(status)) return;
  const d = db();
  const prev = d.prepare("SELECT status FROM applications WHERE id = ?").get(id) as
    | { status: Status }
    | undefined;
  if (!prev || prev.status === status) return;
  d.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    id,
  );
  d.prepare("INSERT INTO events (application_id, status) VALUES (?, ?)").run(id, status);
  done();
}

/**
 * Adds a free-text note to an application's timeline.
 */
export async function addNote(id: number, note: string) {
  const text = String(note ?? "").trim().slice(0, 5000);
  if (!Number.isInteger(id) || !text) return;
  const d = db();
  d.prepare("INSERT INTO events (application_id, note) VALUES (?, ?)").run(id, text);
  d.prepare("UPDATE applications SET updated_at = datetime('now') WHERE id = ?").run(id);
  done();
}

/**
 * Logs "Followed up" in the timeline, which also restarts the follow-up countdown.
 */
export async function markFollowedUp(id: number) {
  if (!Number.isInteger(id)) return;
  const d = db();
  d.prepare("INSERT INTO events (application_id, note) VALUES (?, 'Followed up')").run(id);
  d.prepare("UPDATE applications SET updated_at = datetime('now') WHERE id = ?").run(id);
  done();
}

/**
 * Deletes an application and its timeline for good.
 */
export async function deleteApplication(id: number) {
  if (!Number.isInteger(id)) return;
  db().prepare("DELETE FROM applications WHERE id = ?").run(id);
  done();
}

/* --------------------------------- CVs -------------------------------- */

/**
 * Adds a new CV, or updates one. If a file is attached, it is saved in data/uploads/
 * (and replaces the old file when editing).
 */
export async function saveCv(form: FormData) {
  const id = optionalId(form, "id");
  const name = str(form, "name", 120);
  if (!name) return { error: "Give the CV a name, e.g. “CV1 – Frontend”." };
  const notes = str(form, "notes", 2000);

  let fileFields: { file_name: string; file_path: string; file_type: string } | null = null;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { error: "File is larger than 10 MB." };
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 10);
    const stored = `${crypto.randomUUID()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), Buffer.from(await file.arrayBuffer()));
    fileFields = {
      file_name: file.name.slice(0, 200),
      file_path: stored,
      file_type: file.type || "application/octet-stream",
    };
  }

  const d = db();
  if (id) {
    const prev = d.prepare("SELECT file_path FROM cvs WHERE id = ?").get(id) as
      | { file_path: string | null }
      | undefined;
    if (!prev) return { error: "CV not found." };
    d.prepare("UPDATE cvs SET name = ?, notes = ? WHERE id = ?").run(name, notes, id);
    if (fileFields) {
      d.prepare("UPDATE cvs SET file_name = ?, file_path = ?, file_type = ? WHERE id = ?").run(
        fileFields.file_name,
        fileFields.file_path,
        fileFields.file_type,
        id,
      );
      removeStored(prev.file_path);
    }
  } else {
    d.prepare(
      "INSERT INTO cvs (name, notes, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?)",
    ).run(
      name,
      notes,
      fileFields?.file_name ?? null,
      fileFields?.file_path ?? null,
      fileFields?.file_type ?? null,
    );
  }
  done();
  return { ok: true };
}

/**
 * Deletes a CV and its file. Applications that used it are kept, just without a CV linked.
 */
export async function deleteCv(id: number) {
  if (!Number.isInteger(id)) return;
  const d = db();
  const prev = d.prepare("SELECT file_path FROM cvs WHERE id = ?").get(id) as
    | { file_path: string | null }
    | undefined;
  d.prepare("DELETE FROM cvs WHERE id = ?").run(id);
  removeStored(prev?.file_path ?? null);
  done();
}

/** Deletes an uploaded file from data/uploads/ (if there is one). */
function removeStored(stored: string | null) {
  if (!stored) return;
  const p = path.join(UPLOAD_DIR, path.basename(stored));
  fs.rm(p, { force: true }, () => {});
}
