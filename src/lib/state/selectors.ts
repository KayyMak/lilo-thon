import { CHECKPOINT_PREREQUISITES } from "./reducer";
import type { ProgressState } from "./types";

/** Derived views of progress. Derive rather than store, so the two can't disagree. */

export function completedTopicIds(state: ProgressState): string[] {
  return Object.entries(state.topics)
    .filter(([, topic]) => topic.status === "complete")
    .map(([id]) => id);
}

/** For "2 Topics until your first Project" on the path view (Goal-Gradient Effect). */
export function topicsUntilCheckpoint(state: ProgressState): number {
  return CHECKPOINT_PREREQUISITES.filter((id) => state.topics[id]?.status !== "complete").length;
}

export function isOnboarded(state: ProgressState): boolean {
  return state.tier !== null;
}
