import type { Language, RunOutcome, TestCase } from "@/lib/execution";

/**
 * The student's whole progress, as one serializable object.
 *
 * It lives in localStorage today and is shaped to become one database row
 * later without reshaping (ADR-0001, ADR-0004). Keep it plain data: no
 * functions, no Dates, no class instances. Anything JSON.stringify would
 * mangle does not belong here.
 *
 * This shape blocks every area of the app. Agree changes with the team before
 * making them, and bump `version` when a change is not backwards-compatible.
 */

export type Tier = "beginner" | "intermediate" | "advanced";

export type TopicStatus = "locked" | "unlocked" | "complete";

/**
 * Where the student is in the Project Checkpoint.
 *
 * Three named phases between the bookends, never more (Miller's Law in
 * BUILD-SPEC). `testing` is the whole Test-Driven Prompting Phase: authoring
 * the Test Specification, generating, running, and re-prompting all happen
 * inside it rather than as phases of their own.
 */
export type Phase = "locked" | "requirements" | "tradeoff" | "testing" | "complete";

export type TopicProgress = {
  status: TopicStatus;
  solvedProblemIds: string[];
};

export type TradeoffDecision = {
  /** The option the student chose, e.g. "hashmap". */
  choice: string;
  /** Their reasoning in their own words, which is the thing actually evaluated. */
  reasoning: string;
  /** The coach's evaluation of the reasoning, not of the choice. */
  verdict: string;
  /** Weak reasoning gets exactly one retry, then the student moves on regardless. */
  retryUsed: boolean;
};

export type GeneratedImplementation = {
  language: Language;
  source: string;
};

export type CheckpointProgress = {
  phase: Phase;
  projectId: string;
  /** Concrete behaviours the coach accepted during the Requirements Phase. */
  requirements: string[];
  tradeoff?: TradeoffDecision;
  /** The Test Specification: behaviour as data, never as test code (ADR-0003). */
  testSpec: TestCase[];
  /** Written by the AI only. The student never edits this by hand. */
  generated?: GeneratedImplementation;
  /**
   * The most recent run of `generated` against `testSpec`. On success,
   * `results[i]` is the verdict for `testSpec[i]`.
   */
  lastRun?: RunOutcome;
};

export type ProgressState = {
  version: 1;
  tier: Tier | null;
  /** The student's choice, set during onboarding and changeable later. */
  language: Language;
  topics: Record<string, TopicProgress>;
  checkpoint: CheckpointProgress;
};
