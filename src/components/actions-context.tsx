/**
 * ACTIONS: the list of things the app can save (add, move, delete, upload…).
 *
 * The screens don't save anything themselves. They ask this list, so the same
 * screens work in two places:
 *   - the real app   → saves to the database on the server (src/server/actions.ts)
 *   - the online demo → saves in the visitor's own browser (src/demo/demo-store.ts)
 */
"use client";

import { createContext, useContext } from "react";

type Result = { error?: string; ok?: boolean } | void;

export type TrackerActions = {
  saveApplication: (form: FormData) => Promise<Result>;
  moveApplication: (id: number, status: string) => Promise<void>;
  addNote: (id: number, note: string) => Promise<void>;
  markFollowedUp: (id: number) => Promise<void>;
  deleteApplication: (id: number) => Promise<void>;
  saveCv: (form: FormData) => Promise<Result>;
  deleteCv: (id: number) => Promise<void>;
};

const ActionsContext = createContext<TrackerActions | null>(null);

export function ActionsProvider({ actions, children }: { actions: TrackerActions; children: React.ReactNode }) {
  return <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>;
}

export function useActions(): TrackerActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("useActions must be used inside <ActionsProvider>");
  return actions;
}
