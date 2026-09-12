import type { TestCase } from "@/lib/execution";
import type { Tier } from "@/lib/state";

export type PracticeProblem = {
  id: string;
  title: string;
  url: string;
  entryPoint: string;
  cases: TestCase[];
};

export const arraysProblems: Record<Tier, PracticeProblem> = {
  beginner: {
    id: "concatenation-of-array",
    title: "Concatenation of Array",
    url: "https://neetcode.io/problems/concatenation-of-array",
    entryPoint: "getConcatenation",
    cases: [
      { label: "Repeated values", input: [[1, 2, 1]], expected: [1, 2, 1, 1, 2, 1] },
      { label: "Single value", input: [[7]], expected: [7, 7] },
      { label: "Distinct values", input: [[3, 1, 4, 2]], expected: [3, 1, 4, 2, 3, 1, 4, 2] },
    ],
  },
  intermediate: {
    id: "majority-element",
    title: "Majority Element",
    url: "https://neetcode.io/problems/majority-element",
    entryPoint: "majorityElement",
    cases: [
      { label: "Mixed values", input: [[3, 2, 3]], expected: 3 },
      { label: "Single value", input: [[8]], expected: 8 },
      { label: "Negative majority", input: [[-1, 2, -1, 3, -1]], expected: -1 },
    ],
  },
  advanced: {
    id: "product-of-array-except-self",
    title: "Product of Array Except Self",
    url: "https://neetcode.io/problems/products-of-array-discluding-self",
    entryPoint: "productExceptSelf",
    cases: [
      { label: "Positive values", input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { label: "One zero", input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
      { label: "Two zeros", input: [[0, 2, 0]], expected: [0, 0, 0] },
    ],
  },
};
