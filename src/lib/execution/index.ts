import { createHash } from "node:crypto";

import { normalizeSource } from "./harness";
import { judge0 } from "./judge0";
import type { ExecutionEngine, RunOutcome, RunRequest, RunSuccess } from "./types";

export type {
  CaseResult,
  ExecutionEngine,
  Language,
  RunOutcome,
  RunRequest,
  TestCase,
} from "./types";
export { LANGUAGES, LANGUAGE_IDS, isLanguage } from "./languages";
export { normalizeSource } from "./harness";

/**
 * The one function the rest of the app is allowed to call.
 *
 * Everything above this line is replaceable: swap `engine` for a different
 * adapter and no caller changes. That is the insurance policy — the execution
 * service has already been swapped once under us (ADR-0005).
 */
const engine: ExecutionEngine = judge0;

/**
 * Identical runs return the cached verdict.
 *
 * This is not a performance tweak. The public Judge0 instance has undocumented
 * rate limits, and during a build we re-run the same handful of solutions
 * constantly. Caching keeps that from becoming the thing that blocks us at
 * hour 14. Cleared whenever the process restarts, which is fine — it is a
 * shield, not a store.
 */
const cache = new Map<string, RunSuccess>();
const CACHE_LIMIT = 200;

function cacheKey(request: RunRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        engine.name,
        request.language,
        request.source,
        request.entryPoint,
        request.cases,
      ])
    )
    .digest("hex");
}

export async function runTests(request: RunRequest): Promise<RunOutcome> {
  const normalized: RunRequest = {
    ...request,
    source: normalizeSource(request.source),
  };

  if (!normalized.source) {
    return { ok: false, reason: "source_error", detail: "no code was submitted" };
  }

  const key = cacheKey(normalized);
  const hit = cache.get(key);
  if (hit) return { ...hit, cached: true };

  const outcome = await engine.run(normalized);

  if (outcome.ok) {
    if (cache.size >= CACHE_LIMIT) {
      // Oldest first; Map preserves insertion order.
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, outcome);
  }

  return outcome;
}

/** True when every case passed. An empty run is not a pass. */
export function allPassed(outcome: RunOutcome): boolean {
  return outcome.ok && outcome.results.length > 0 && outcome.results.every((r) => r.passed);
}
