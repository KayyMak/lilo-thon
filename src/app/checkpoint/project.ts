import type { TopicId } from "@/lib/state";
import type { TradeoffOption } from "@/lib/prompts/protocol";

/**
 * The Project Checkpoint's content, hardcoded on purpose (BUILD-SPEC, Content).
 *
 * A word-frequency counter, chosen because it genuinely needs a hash map for the
 * counts and an array for the ordering — so the Tradeoff Phase is a real
 * decision rather than a staged one — and because its behaviour expresses
 * cleanly as inputs paired with expected outputs.
 *
 * Nothing here explains how to write it. That is the student's requirements to
 * state and the AI's code to write.
 */
export const PROJECT = {
  /** Matches `checkpoint.projectId` in the initial state. */
  id: "word-frequency",
  title: "Word-frequency counter",
  /** Canonical entry point. The runner also accepts the snake_case spelling. */
  entryPoint: "topWords",
  signature: "topWords(text, n)",
  /** The one paragraph every prompt is given. Behaviour, not implementation. */
  brief:
    "A function topWords(text, n) that takes a string of text and a whole number n, and returns the n most frequent words in that text, most frequent first.",
} as const;

/**
 * The decision the Tradeoff Phase puts to the student.
 *
 * The screen asks it, not the model: the question is fixed, so asking it costs a
 * model call the student would wait on for nothing. The model's job is the part
 * that cannot be scripted — judging the reasoning that comes back.
 */
export const TRADEOFF_DECISION =
  "While the counter reads the text, how should it hold the count for each word?";

/**
 * One option per Topic, so the two sides are things the student has actually
 * completed (BUILD-SPEC, Content). Both are defensible at this size, which is
 * what makes the reasoning the interesting part (Tesler's Law).
 */
export const TRADEOFF_OPTIONS: Record<TopicId, TradeoffOption> = {
  arrays: {
    id: "an array of pairs",
    label: "An array of pairs",
    summary: "Keep [word, count] pairs in one array, and scan it to find a word before updating it.",
  },
  hashing: {
    id: "a hash map",
    label: "A hash map",
    summary: "Key each word to its count, and put the counts in order once the text is read.",
  },
};

/** Placeholders for the Test Specification rows, in the shape the runner expects. */
export const TEST_SPEC_PLACEHOLDERS = {
  input: '"the cat sat on the mat", 1',
  expected: '["the"]',
  label: "ties, empty text, casing…",
};
