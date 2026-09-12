import { RESULT_MARKER } from "./harness";
import { specFor } from "./languages";
import type { CaseResult, ExecutionEngine, RunOutcome, RunRequest } from "./types";

const BASE = process.env.JUDGE0_URL ?? "https://ce.judge0.com";

/**
 * Judge0 adapter.
 *
 * Chosen after the public Piston API went whitelist-only; see ADR-0005. The
 * public Judge0 CE instance needs no key, which is why there is no auth here —
 * if that changes, add a header and nothing outside this file moves.
 */
export const judge0: ExecutionEngine = {
  name: "judge0",

  async run(request: RunRequest): Promise<RunOutcome> {
    const spec = specFor(request.language);
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(`${BASE}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.JUDGE0_KEY
            ? { "X-RapidAPI-Key": process.env.JUDGE0_KEY }
            : {}),
        },
        body: JSON.stringify({
          source_code: spec.wrap(request.source),
          language_id: spec.judge0Id,
          stdin: JSON.stringify({
            entryPoints: spec.entryPointAliases(request.entryPoint),
            cases: request.cases,
          }),
          cpu_time_limit: 5,
          wall_time_limit: 10,
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      return {
        ok: false,
        reason: "transport",
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      return {
        ok: false,
        reason: "transport",
        detail: `judge0 returned ${response.status}: ${body}`,
      };
    }

    const submission = (await response.json()) as {
      stdout: string | null;
      stderr: string | null;
      compile_output: string | null;
      status?: { description?: string };
    };

    const stdout = submission.stdout ?? "";
    const markerAt = stdout.lastIndexOf(RESULT_MARKER);

    if (markerAt === -1) {
      // The harness never reported, so the student's own code is the suspect.
      const detail =
        submission.compile_output?.trim() ||
        submission.stderr?.trim() ||
        submission.status?.description ||
        "no output";
      return { ok: false, reason: "source_error", detail: detail.slice(0, 800) };
    }

    let payload: { error?: string; lookedFor?: string[]; results?: CaseResult[] };
    try {
      payload = JSON.parse(stdout.slice(markerAt + RESULT_MARKER.length));
    } catch {
      return { ok: false, reason: "source_error", detail: "unreadable harness output" };
    }

    if (payload.error === "entry_point_not_found") {
      return {
        ok: false,
        reason: "entry_point_not_found",
        detail: `expected a function named ${(payload.lookedFor ?? []).join(" or ")}`,
      };
    }

    const results = (payload.results ?? []).map((result, index) => ({
      ...result,
      label: request.cases[index]?.label,
    }));

    return {
      ok: true,
      results,
      ms: Date.now() - started,
      engine: "judge0",
      cached: false,
    };
  },
};
