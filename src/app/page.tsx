/**
 * HOME PAGE: the only page of the app (http://localhost:3000).
 * It reads everything from the database on the server and hands it to
 * <JobtrailApp>, which draws the board, CV library and insights.
 */
import { Suspense } from "react";
import { connection } from "next/server";
import { getTrackerData } from "@/server/queries";
import JobtrailApp from "@/components/JobtrailApp";

async function TrackerData() {
  // The database is read on every request, never baked in at build time.
  await connection();
  return <JobtrailApp data={getTrackerData()} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-sm text-muted">Loading your applications…</div>}
    >
      <TrackerData />
    </Suspense>
  );
}
