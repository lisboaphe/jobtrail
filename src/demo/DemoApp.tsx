/**
 * DEMO APP: the online demo's version of the home page.
 * Shows a small "this is a demo" bar, then the normal Jobtrail screens,
 * connected to the in-browser demo store instead of the server.
 */
"use client";

import { useSyncExternalStore } from "react";
import JobtrailApp from "@/components/JobtrailApp";
import { ActionsProvider } from "@/components/actions-context";
import { demoActions, getServerSnapshot, getSnapshot, resetDemo, subscribe } from "./demo-store";

export default function DemoApp() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-2 text-center text-[13px] text-ink-fg">
        <span className="mono">Demo</span>
        <span className="opacity-80">Sample data. Your changes are saved only in this browser.</span>
        <button
          className="mono underline underline-offset-4 hover:opacity-70"
          onClick={() => {
            if (confirm("Reset the demo? Your changes will be replaced by the sample data.")) resetDemo();
          }}
        >
          Reset demo
        </button>
        <a
          className="mono underline underline-offset-4 hover:opacity-70"
          href="https://github.com/lisboaphe/jobtrail"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code ↗
        </a>
      </div>
      {data ? (
        <ActionsProvider actions={demoActions}>
          <JobtrailApp data={data} />
        </ActionsProvider>
      ) : (
        <div className="p-10 text-center text-sm text-muted">Loading demo…</div>
      )}
    </>
  );
}
