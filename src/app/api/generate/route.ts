import { NextResponse } from "next/server";

import {
  MAX_GENERATE_TOKENS,
  MODEL,
  THINKING,
  buildGenerateTurn,
  claude,
  coachErrorMessage,
  extractSource,
  isConfigured,
  parseGenerateRequest,
} from "@/lib/prompts";
import type { GenerateResponse } from "@/lib/prompts/protocol";

/**
 * Writes the implementation the student asked for, and nothing else.
 *
 * Not streamed: the source is only useful once it is whole, because the next
 * thing that happens to it is a run against the student's tests. The screen
 * keeps its own progress state while this is in flight.
 *
 * This route never decides whether what it wrote is correct — the student's
 * Test Specification does, through `/api/run`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, reason: "bad_request", detail: "expected JSON" }, 400);
  }

  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) return reply({ ok: false, reason: "bad_request", detail: parsed.detail }, 400);

  if (!isConfigured()) {
    return reply(
      {
        ok: false,
        reason: "unconfigured",
        detail: "Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
      },
      503
    );
  }

  const { system, messages } = buildGenerateTurn(parsed.request);

  try {
    const message = await claude().messages.create({
      model: MODEL,
      max_tokens: MAX_GENERATE_TOKENS,
      thinking: THINKING,
      system,
      messages,
    });

    if (message.stop_reason === "refusal") {
      return reply(
        { ok: false, reason: "model", detail: "The model declined that prompt. Try rephrasing it." },
        200
      );
    }

    // A truncated implementation would fail the tests for a reason that has
    // nothing to do with the student's prompt, so it is never run.
    if (message.stop_reason === "max_tokens") {
      return reply(
        {
          ok: false,
          reason: "truncated",
          detail: "The implementation came back unfinished. Ask for something smaller.",
        },
        200
      );
    }

    const text = message.content
      .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const source = extractSource(text);
    if (!source) {
      return reply(
        { ok: false, reason: "model", detail: "No code came back. Try prompting again." },
        200
      );
    }

    return reply({ ok: true, source }, 200);
  } catch (error) {
    return reply({ ok: false, reason: "model", detail: coachErrorMessage(error) }, 502);
  }
}

function reply(payload: GenerateResponse, status: number) {
  return NextResponse.json(payload, { status });
}
