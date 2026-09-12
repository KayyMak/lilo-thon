import type { Language, RunOutcome, TestCase } from "@/lib/execution";

import type { GeneratedImplementation, ProgressState, Tier } from "./types";

/**
 * Every change to progress goes through this reducer. Nothing else writes
 * state, which keeps the phase machine in one plainly-written place (ADR-0004).
 *
 * Transitions are guarded: an action that doesn't fit the current phase is
 * ignored and returns the same state, so a double click or a stale response
 * from a slow model call can't skip the student ahead.
 */

/**
 * Problems a student must solve to complete a Topic. The glossary says a Topic
 * takes several; one is a demo setting, not the concept.
 */
export const REQUIRED_PROBLEMS_PER_TOPIC = 1;

/** Topics in path order. Completing one unlocks the next. */
export const TOPIC_IDS = ["arrays", "hashing"] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

/**
 * Topics that must be complete before the Project Checkpoint unlocks. Both,
 * because the Tradeoff Phase asks array or hashmap and its options must come
 * from Topics the student has actually completed.
 */
export const CHECKPOINT_PREREQUISITES: readonly TopicId[] = TOPIC_IDS;

export const initialState: ProgressState = {
  version: 1,
  tier: null,
  language: "python",
  topics: {
    arrays: { status: "unlocked", solvedProblemIds: [] },
    hashing: { status: "locked", solvedProblemIds: [] },
  },
  checkpoint: {
    phase: "locked",
    projectId: "word-frequency",
    requirements: [],
    testSpec: [],
  },
};

export type ProgressAction =
  | { type: "placeInTier"; tier: Tier }
  | { type: "chooseLanguage"; language: Language }
  /** A pasted solution ran and passed every case. Only the runner decides that. */
  | { type: "solveProblem"; topicId: string; problemId: string }
  | { type: "acceptRequirement"; statement: string }
  | { type: "finishRequirements" }
  /** The coach evaluated the student's reasoning; `sound` is its judgment of it. */
  | { type: "evaluateTradeoff"; choice: string; reasoning: string; verdict: string; sound: boolean }
  | { type: "setTestSpec"; testSpec: TestCase[] }
  | { type: "receiveGenerated"; generated: GeneratedImplementation }
  | { type: "recordRun"; outcome: RunOutcome }
  | { type: "reset" };

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "placeInTier":
      return { ...state, tier: action.tier };

    case "chooseLanguage":
      return { ...state, language: action.language };

    case "solveProblem": {
      const topic = state.topics[action.topicId];
      if (!topic || topic.status === "locked") return state;
      if (topic.solvedProblemIds.includes(action.problemId)) return state;

      const solvedProblemIds = [...topic.solvedProblemIds, action.problemId];
      const status =
        solvedProblemIds.length >= REQUIRED_PROBLEMS_PER_TOPIC ? "complete" : topic.status;

      let topics = { ...state.topics, [action.topicId]: { status, solvedProblemIds } };
      if (status === "complete") topics = unlockNextTopic(topics, action.topicId);
      return unlockCheckpoint({ ...state, topics });
    }

    case "acceptRequirement": {
      if (state.checkpoint.phase !== "requirements") return state;
      const statement = action.statement.trim();
      if (!statement) return state;
      return withCheckpoint(state, {
        requirements: [...state.checkpoint.requirements, statement],
      });
    }

    case "finishRequirements":
      if (state.checkpoint.phase !== "requirements") return state;
      return withCheckpoint(state, { phase: "tradeoff" });

    case "evaluateTradeoff": {
      if (state.checkpoint.phase !== "tradeoff") return state;
      const retryUsed = state.checkpoint.tradeoff?.retryUsed ?? false;
      const { choice, reasoning, verdict } = action;

      // Weak reasoning on the first try: stay here and spend the one retry.
      if (!action.sound && !retryUsed) {
        return withCheckpoint(state, {
          tradeoff: { choice, reasoning, verdict, retryUsed: true },
        });
      }

      // Sound reasoning, or the retry is spent. The model never blocks progress.
      return withCheckpoint(state, {
        tradeoff: { choice, reasoning, verdict, retryUsed },
        phase: "testing",
      });
    }

    case "setTestSpec":
      if (state.checkpoint.phase !== "testing") return state;
      // A previous run was against a different spec, so its verdicts no longer apply.
      return withCheckpoint(state, { testSpec: action.testSpec, lastRun: undefined });

    case "receiveGenerated":
      if (state.checkpoint.phase !== "testing") return state;
      return withCheckpoint(state, { generated: action.generated, lastRun: undefined });

    case "recordRun": {
      if (state.checkpoint.phase !== "testing") return state;
      const phase = everyCasePassed(action.outcome) ? "complete" : "testing";
      return withCheckpoint(state, { lastRun: action.outcome, phase });
    }

    case "reset":
      return initialState;
  }
}

function withCheckpoint(
  state: ProgressState,
  patch: Partial<ProgressState["checkpoint"]>
): ProgressState {
  return { ...state, checkpoint: { ...state.checkpoint, ...patch } };
}

function unlockNextTopic(
  topics: ProgressState["topics"],
  completedId: string
): ProgressState["topics"] {
  const next = TOPIC_IDS[TOPIC_IDS.indexOf(completedId as TopicId) + 1];
  if (!next || topics[next]?.status !== "locked") return topics;
  return { ...topics, [next]: { ...topics[next], status: "unlocked" } };
}

function unlockCheckpoint(state: ProgressState): ProgressState {
  if (state.checkpoint.phase !== "locked") return state;
  const ready = CHECKPOINT_PREREQUISITES.every((id) => state.topics[id]?.status === "complete");
  return ready ? withCheckpoint(state, { phase: "requirements" }) : state;
}

/**
 * Mirrors `allPassed` in @/lib/execution. That module pulls in node:crypto for
 * its cache, so importing a value from it would drag server code into the
 * client bundle. Types are erased and safe to import; functions are not.
 */
function everyCasePassed(outcome: RunOutcome): boolean {
  return outcome.ok && outcome.results.length > 0 && outcome.results.every((r) => r.passed);
}
