import type { Language } from "./languages";

/**
 * The boundary between lilo-thon and whatever actually runs student code.
 *
 * Nothing outside this directory may know which execution service is in use.
 * That is the whole point: the service we depend on has already been replaced
 * once (ADR-0005) and may be replaced again, and the cost of doing so should
 * stay at "rewrite one adapter".
 *
 * Language is deliberately NOT a hardcoded union here — it is derived from the
 * registry in languages.ts, so the set of supported languages is data rather
 * than a decision frozen into the type system.
 */

export type { Language };

/** A single expectation, authored as data rather than as test code. See ADR-0003. */
export type TestCase = {
  /** Positional arguments applied to the entry point. */
  input: unknown[];
  expected: unknown;
  /** Optional human label, e.g. "empty input". */
  label?: string;
};

export type CaseResult = {
  passed: boolean;
  /** Omitted when the call threw before producing a value. */
  actual?: unknown;
  /** Present only on a thrown exception, already formatted for display. */
  error?: string;
  label?: string;
};

export type RunRequest = {
  language: Language;
  source: string;
  /** Canonical entry point name, e.g. "twoSum". Aliases are derived per language. */
  entryPoint: string;
  cases: TestCase[];
};

export type RunFailure = {
  ok: false;
  reason:
    | /** Ran, but defined none of the expected function names. */ "entry_point_not_found"
    | /** Service refused, timed out, or was unreachable. */ "transport"
    | /** Failed to compile, or crashed before the harness could report. */ "source_error";
  detail: string;
};

export type RunSuccess = {
  ok: true;
  results: CaseResult[];
  /** Wall-clock milliseconds, so slowness is surfaced rather than hidden. */
  ms: number;
  /** Which engine produced this, for debugging. */
  engine: string;
  cached: boolean;
};

export type RunOutcome = RunSuccess | RunFailure;

export interface ExecutionEngine {
  readonly name: string;
  run(request: RunRequest): Promise<RunOutcome>;
}
