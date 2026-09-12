import type { Tier } from "@/lib/state";
import type { PracticeProblem } from "./arrays";

export const hashingProblems: Record<Tier, PracticeProblem> = {
  beginner: {
    id: "contains-duplicate",
    title: "Contains Duplicate",
    url: "https://neetcode.io/problems/duplicate-integer",
    entryPoint: "hasDuplicate",
    cases: [
      { label: "Repeated value", input: [[5, 2, 5]], expected: true },
      { label: "Distinct values", input: [[8, 3, 6]], expected: false },
      { label: "Empty input", input: [[]], expected: false },
      { label: "Negative duplicate", input: [[-4, 0, -4]], expected: true },
    ],
  },
  intermediate: {
    id: "valid-anagram",
    title: "Valid Anagram",
    url: "https://neetcode.io/problems/is-anagram",
    entryPoint: "isAnagram",
    cases: [
      { label: "Reordered letters", input: ["silent", "listen"], expected: true },
      { label: "Different letters", input: ["cat", "car"], expected: false },
      { label: "Different lengths", input: ["a", "aa"], expected: false },
      { label: "Different letter counts", input: ["aab", "abb"], expected: false },
    ],
  },
  advanced: {
    id: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    url: "https://neetcode.io/problems/longest-consecutive-sequence",
    entryPoint: "longestConsecutive",
    cases: [
      { label: "Unsorted sequence", input: [[12, 4, 2, 3, 1, 20]], expected: 4 },
      { label: "Empty input", input: [[]], expected: 0 },
      { label: "Duplicates do not extend a sequence", input: [[2, 2, 3, 1]], expected: 3 },
      { label: "Sequence across zero", input: [[-2, 1, 0, -1, 8]], expected: 4 },
    ],
  },
};
