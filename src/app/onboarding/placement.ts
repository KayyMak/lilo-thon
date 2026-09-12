import type { Tier } from "@/lib/state";

/**
 * Onboarding questions and Tier placement, exactly as BUILD-SPEC defines them.
 *
 * Placement is plain logic, never a model call. Each answer is worth its index
 * (0 to 3), so the options must stay in the order listed. Four questions, four
 * options each, no free text (Hick's Law).
 */

export type Question = {
  prompt: string;
  options: readonly [string, string, string, string];
};

export const QUESTIONS: readonly Question[] = [
  {
    prompt: "How much programming have you done?",
    options: [
      "None yet",
      "One intro course",
      "A few courses or personal projects",
      "An internship or job",
    ],
  },
  {
    prompt: "Which could you use to solve a problem without looking anything up?",
    options: [
      "Loops and lists",
      "Dictionaries or hash maps",
      "Recursion or trees",
      "Graphs or dynamic programming",
    ],
  },
  {
    prompt: "How do Easy LeetCode problems usually go for you?",
    options: [
      "Haven't tried one",
      "Usually stuck",
      "Usually solve them, sometimes with hints",
      "Solve most, working on Mediums",
    ],
  },
  {
    prompt: "Given a list of numbers, you need two that add up to a target. What's your first idea?",
    options: [
      "Not sure yet",
      "Try every pair",
      "Sort the list, then walk inward from both ends",
      "Remember the numbers already seen, and check for each new one's partner",
    ],
  },
];

/** Index of the one question that checks the student's self-report. */
const CHECK_QUESTION = 3;

/**
 * `answers[i]` is the chosen option index for `QUESTIONS[i]`.
 *
 * 0 to 4 is Beginner, 5 to 8 Intermediate, 9 to 12 Advanced. "Not sure yet" on
 * the check question caps placement at Intermediate, because self-report alone
 * cannot earn Advanced.
 */
export function placeTier(answers: readonly number[]): Tier {
  const total = answers.reduce((sum, answer) => sum + answer, 0);
  const tier: Tier = total <= 4 ? "beginner" : total <= 8 ? "intermediate" : "advanced";

  if (tier === "advanced" && answers[CHECK_QUESTION] === 0) return "intermediate";
  return tier;
}
