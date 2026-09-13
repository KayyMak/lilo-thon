import { isLanguage, type Language, type TestCase } from "@/lib/execution";
import type { Tier } from "@/lib/state";

import type {
  ChatTurn,
  CoachRequest,
  FailingCase,
  GenerateRequest,
  TradeoffOption,
} from "./protocol";

/**
 * Turns whatever arrived over the wire into a request the prompts can trust.
 *
 * Liberal in what it accepts (Postel's Law): a missing label, a stray field or
 * an over-long paste is shaped into something usable rather than rejected,
 * because every 400 here is a demo that stalls. Only what the prompt genuinely
 * cannot work without is an error.
 *
 * Server-only. The browser sends these; nothing here should run there.
 */

export type Parsed<T> = { ok: true; request: T } | { ok: false; detail: string };

type Bag = Record<string, unknown>;

function bag(value: unknown): Bag {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Bag) : {};
}

/** Trimmed, and capped so a pasted novel cannot blow up a turn. */
function text(value: unknown, limit = 4_000): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function tier(value: unknown): Tier | null {
  return value === "beginner" || value === "intermediate" || value === "advanced" ? value : null;
}

function language(value: unknown): Language | null {
  return isLanguage(value) ? value : null;
}

function statements(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => text(entry, 400))
    .filter(Boolean)
    .slice(0, limit);
}

function turns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const turn = bag(entry);
      const content = text(turn.content);
      const role = turn.role === "assistant" ? "assistant" : "user";
      return content ? { role, content } : null;
    })
    .filter((turn): turn is ChatTurn => turn !== null)
    .slice(-24);
}

function failingCase(value: unknown): FailingCase | null {
  const entry = bag(value);
  if (!Array.isArray(entry.input)) return null;
  const failing: FailingCase = { input: entry.input, expected: entry.expected };
  const label = text(entry.label, 120);
  if (label) failing.label = label;
  if ("actual" in entry) failing.actual = entry.actual;
  const error = text(entry.error, 600);
  if (error) failing.error = error;
  return failing;
}

function options(value: unknown): TradeoffOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const option = bag(entry);
      const id = text(option.id, 40);
      const label = text(option.label, 120);
      return id && label ? { id, label, summary: text(option.summary, 400) } : null;
    })
    .filter((option): option is TradeoffOption => option !== null)
    .slice(0, 2);
}

function testCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const testCase = bag(entry);
      if (!Array.isArray(testCase.input)) return null;
      const parsed: TestCase = { input: testCase.input, expected: testCase.expected };
      const label = text(testCase.label, 120);
      if (label) parsed.label = label;
      return parsed;
    })
    .filter((testCase): testCase is TestCase => testCase !== null)
    .slice(0, 20);
}

export function parseCoachRequest(body: unknown): Parsed<CoachRequest> {
  const input = bag(body);
  const studentTier = tier(input.tier);
  if (!studentTier) return { ok: false, detail: "tier is required" };
  const messages = turns(input.messages);

  switch (input.surface) {
    case "hint": {
      const chosen = language(input.language);
      if (!chosen) return { ok: false, detail: "language is required" };
      const failing = failingCase(input.failing);
      return {
        ok: true,
        request: {
          surface: "hint",
          tier: studentTier,
          language: chosen,
          topic: text(input.topic, 80) || "this Topic",
          problem: text(input.problem, 120) || "this Practice Problem",
          problemUrl: text(input.problemUrl, 300),
          ...(failing ? { failing } : {}),
          messages,
        },
      };
    }

    case "requirements":
      return {
        ok: true,
        request: {
          surface: "requirements",
          tier: studentTier,
          brief: text(input.brief, 1_200),
          accepted: statements(input.accepted),
          messages,
        },
      };

    case "tradeoff": {
      const reasoning = text(input.reasoning, 2_000);
      if (!reasoning) return { ok: false, detail: "reasoning is required" };
      const previous = bag(input.previous);
      const previousReasoning = text(previous.reasoning, 2_000);
      const previousVerdict = text(previous.verdict, 2_000);
      return {
        ok: true,
        request: {
          surface: "tradeoff",
          tier: studentTier,
          brief: text(input.brief, 1_200),
          decision: text(input.decision, 400),
          options: options(input.options),
          choice: text(input.choice, 120) || "one of the options",
          reasoning,
          retryUsed: input.retryUsed === true,
          ...(previousReasoning && previousVerdict
            ? { previous: { reasoning: previousReasoning, verdict: previousVerdict } }
            : {}),
        },
      };
    }

    case "diagnose": {
      const chosen = language(input.language);
      if (!chosen) return { ok: false, detail: "language is required" };
      const source = text(input.source, 12_000);
      if (!source) return { ok: false, detail: "source is required" };
      const failing = failingCase(input.failing);
      if (!failing) return { ok: false, detail: "a failing case is required" };
      return {
        ok: true,
        request: {
          surface: "diagnose",
          tier: studentTier,
          language: chosen,
          brief: text(input.brief, 1_200),
          source,
          failing,
          messages,
        },
      };
    }

    default:
      return { ok: false, detail: `unknown surface: ${String(input.surface)}` };
  }
}

export function parseGenerateRequest(body: unknown): Parsed<GenerateRequest> {
  const input = bag(body);
  const chosen = language(input.language);
  if (!chosen) return { ok: false, detail: `unsupported language: ${String(input.language)}` };

  const entryPoint = text(input.entryPoint, 80);
  if (!entryPoint) return { ok: false, detail: "entryPoint is required" };

  const testSpec = testCases(input.testSpec);
  if (!testSpec.length) return { ok: false, detail: "at least one test case is required" };

  const instruction = text(input.instruction, 4_000);
  if (!instruction) return { ok: false, detail: "a prompt is required" };

  const previous = bag(input.previous);
  const previousSource = text(previous.source, 12_000);

  return {
    ok: true,
    request: {
      language: chosen,
      entryPoint,
      brief: text(input.brief, 1_200),
      requirements: statements(input.requirements),
      testSpec,
      instruction,
      ...(previousSource ? { previous: { source: previousSource } } : {}),
    },
  };
}
