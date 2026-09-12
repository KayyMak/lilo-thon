import { initialState } from "./reducer";
import type { ProgressState } from "./types";

/**
 * localStorage is per-origin, so a plain key is enough and keeps the
 * provisional product name out of stored data.
 */
const STORAGE_KEY = "progress";

/**
 * Read progress back, or null when there is none worth keeping.
 *
 * Postel's Law applies: anything unreadable or from another `version` is
 * dropped rather than thrown, because a crash on load is a stalled demo.
 */
export function loadProgress(): ProgressState | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked, e.g. some private windows.
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState> | null;
    if (!parsed || parsed.version !== initialState.version) return null;

    return {
      ...initialState,
      ...parsed,
      // Topics added since this state was saved start at their initial status.
      topics: { ...initialState.topics, ...parsed.topics },
      checkpoint: { ...initialState.checkpoint, ...parsed.checkpoint },
    };
  } catch {
    return null;
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or blocked storage: progress lasts for this tab only. Known and accepted.
  }
}
