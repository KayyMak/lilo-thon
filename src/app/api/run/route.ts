import { NextResponse } from "next/server";

import { isLanguage, runTests, type TestCase } from "@/lib/execution";

/**
 * Runs student or generated code against test cases.
 *
 * The only place in the system permitted to decide whether code is correct.
 * Models explain failures; they never adjudicate them.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request", detail: "expected JSON" }, { status: 400 });
  }

  const { language, source, entryPoint, cases } = (body ?? {}) as {
    language?: unknown;
    source?: unknown;
    entryPoint?: unknown;
    cases?: unknown;
  };

  if (!isLanguage(language)) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", detail: `unsupported language: ${String(language)}` },
      { status: 400 }
    );
  }
  if (typeof source !== "string") {
    return NextResponse.json(
      { ok: false, reason: "bad_request", detail: "source must be a string" },
      { status: 400 }
    );
  }
  if (typeof entryPoint !== "string" || !entryPoint) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", detail: "entryPoint is required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(cases) || cases.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", detail: "at least one test case is required" },
      { status: 400 }
    );
  }

  const outcome = await runTests({
    language,
    source,
    entryPoint,
    cases: cases as TestCase[],
  });

  // A failed run is a legitimate answer, not an HTTP error. Only a malformed
  // request gets a 4xx; transport trouble gets 502 so the client can retry.
  const status = outcome.ok ? 200 : outcome.reason === "transport" ? 502 : 200;
  return NextResponse.json(outcome, { status });
}
