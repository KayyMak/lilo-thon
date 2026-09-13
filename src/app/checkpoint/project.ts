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
  input: '"your text here", 2',
  expected: '["word", "word"]',
  label: "ties, empty text, casing…",
};

/**
 * What each column of a test row means, in the student's terms. The format is
 * the part students get wrong, so it is stated outright rather than implied.
 */
export const TEST_SPEC_COLUMNS = {
  input: {
    heading: "Input",
    format: 'The text in double quotes, a comma, then how many words to return.',
  },
  expected: {
    heading: "Should return",
    format: 'A list in square brackets, most frequent first. Use [] when there are no words.',
  },
  label: {
    heading: "What it checks",
    format: "A short name, so a failure tells you what broke.",
  },
};

/**
 * One case shown above the editor to demonstrate the format. Shown, never
 * pre-filled: writing the tests is the skill this phase practises, so the
 * student still authors every case that runs. Any correct implementation
 * passes it, so it cannot mislead.
 */
export const EXAMPLE_TEST_CASE = {
  input: '"the cat the dog", 1',
  expected: '["the"]',
  label: "most frequent word",
};

/**
 * Catches rows that parsed but can never describe topWords, with a message that
 * says how to fix them. A row like `the` for the expected value parses as the
 * string "the", and would otherwise fail every run for a reason the student
 * cannot see.
 */
export function checkTestCase(input: unknown[], expected: unknown): string | null {
  const [text, n] = input;
  if (input.length !== 2 || typeof text !== "string" || !Number.isInteger(n)) {
    return 'Input needs the text in double quotes, a comma, then a whole number, like "the cat the dog", 1.';
  }
  if (!Array.isArray(expected) || !expected.every((word) => typeof word === "string")) {
    return 'Should return needs a list of words in square brackets, like ["the"], or [] for none.';
  }
  return null;
}
