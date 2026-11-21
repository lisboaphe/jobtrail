/**
 * DATA SHAPES: describes what a CV, an application and a timeline event
 * look like, so the editor can warn you about typos and missing fields.
 */
import type { Status } from "./statuses";

export type { Status };

export type Cv = {
  id: number;
  name: string;
  notes: string;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
};

export type Application = {
  id: number;
  company: string;
  role: string;
  status: Status;
  cv_id: number | null;
  source: string;
  url: string;
  location: string;
  salary: string;
  contact: string;
  notes: string;
  applied_at: string;
  follow_up_days: number;
  created_at: string;
  updated_at: string;
};

export type TimelineEvent = {
  id: number;
  application_id: number;
  status: Status | null;
  note: string;
  at: string;
};

export type TrackerData = {
  cvs: Cv[];
  applications: Application[];
  events: TimelineEvent[];
  today: string;
};
