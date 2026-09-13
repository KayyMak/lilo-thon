import type Anthropic from "@anthropic-ai/sdk";

import { LANGUAGES, normalizeSource } from "@/lib/execution";

import type { GenerateRequest } from "./protocol";

/**
 * The generation surface: implementation only (BUILD-SPEC, AI surfaces).
 *
 * The student is the one holding the specification, so everything the model is
 * given here came from them — their requirements, their Test Specification,
 * their prompt. Nothing in this file describes what the program should do.
 *
 * On a re-prompt the previous implementation is sent back but the failing cases
 * are NOT. Saying what broke is the student's job; that is the skill the phase
 * exists to practise, and handing the model the failures would do it for them.
 */

function systemPrompt(languageLabel: string, entryPoint: string): string {
  return `You write implementation code for a student on lilo-thon who is directing you. They wrote the requirements and the tests. You write the code, all of it, every time — they never edit what you produce, so a partial answer is a dead end for them.

Hard rules:
- Output the implementation and nothing else. No explanation, no commentary, no markdown fence, no example usage, no tests, no main block.
- Define one top-level function named exactly ${entryPoint}, taking its arguments positionally in the order the test cases show.
- ${languageLabel} only, standard library only.
- Return the value. Never print it.
- The test cases are the specification. Satisfy every one of them.`;
}

function renderCases(request: GenerateRequest): string {
  if (!request.testSpec.length) return "The student has not written any test cases yet.";
  return request.testSpec
    .map((testCase, index) => {
      const label = testCase.label ? ` (${testCase.label})` : "";
      return `${index + 1}.${label} ${request.entryPoint}(${testCase.input
        .map((argument) => JSON.stringify(argument))
        .join(", ")}) must return ${JSON.stringify(testCase.expected)}`;
    })
    .join("\n");
}

/**
 * Pulls the implementation out of whatever came back.
 *
 * The prompt forbids commentary and fences, and a model that ignores that is
 * not a reason to fail the student's prompt (Postel's Law), so a fenced block
 * is unwrapped here before the source reaches the runner.
 */
export function extractSource(raw: string): string {
  const fenced = raw.match(/```[\w+-]*\n([\s\S]*?)```/);
  return normalizeSource(fenced ? fenced[1] : raw);
}

/** Builds the single, non-streaming call that returns an implementation. */
export function buildGenerateTurn(request: GenerateRequest): {
  system: string;
  messages: Anthropic.MessageParam[];
} {
  // The label comes from the execution registry, so a new language needs no
  // change here — one entry there and this prompt speaks it (ADR-0005).
  const system = systemPrompt(LANGUAGES[request.language].label, request.entryPoint);

  const requirements = request.requirements.length
    ? request.requirements.map((statement) => `- ${statement}`).join("\n")
    : "- None recorded.";

  const parts = [
    `Project: ${request.brief}`,
    `Requirements the student settled on:\n${requirements}`,
    `Their test cases:\n${renderCases(request)}`,
  ];

  if (request.previous) {
    parts.push(
      `Your previous implementation, which they are asking you to change:\n${request.previous.source}`
    );
  }

  parts.push(`Their prompt:\n${request.instruction}`);

  return { system, messages: [{ role: "user", content: parts.join("\n\n") }] };
}
