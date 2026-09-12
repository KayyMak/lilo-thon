"use client";

import { createContext, useContext, useEffect, useReducer, type Dispatch } from "react";

import { initialState, progressReducer, type ProgressAction } from "./reducer";
import { loadProgress, saveProgress } from "./storage";
import type { ProgressState } from "./types";

type ProgressContextValue = {
  state: ProgressState;
  dispatch: Dispatch<ProgressAction>;
  /**
   * False until stored progress has been read. The server and the first client
   * render can't see localStorage, so until this flips `state` is the initial
   * state. Route on it before then and a returning student gets bounced back
   * to onboarding.
   */
  hydrated: boolean;
};

/**
 * Hydration is the provider's business, not a learner action, so it stays out
 * of ProgressAction and components can't dispatch it.
 */
type Store = { progress: ProgressState; hydrated: boolean };
type StoreAction = ProgressAction | { type: "hydrate"; stored: ProgressState | null };

function storeReducer(store: Store, action: StoreAction): Store {
  if (action.type === "hydrate") {
    return { progress: action.stored ?? store.progress, hydrated: true };
  }
  const progress = progressReducer(store.progress, action);
  return progress === store.progress ? store : { ...store, progress };
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [{ progress, hydrated }, dispatch] = useReducer(storeReducer, {
    progress: initialState,
    hydrated: false,
  });

  // Rehydrate once on mount, landing the student back where they left off.
  useEffect(() => {
    dispatch({ type: "hydrate", stored: loadProgress() });
  }, []);

  // Persist on every change, but only after hydrating, or the initial state
  // would overwrite what was stored before it could be read.
  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [progress, hydrated]);

  return (
    <ProgressContext value={{ state: progress, dispatch, hydrated }}>{children}</ProgressContext>
  );
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside <ProgressProvider>");
  return value;
}
