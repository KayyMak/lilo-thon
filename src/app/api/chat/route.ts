import {
  MAX_COACH_TOKENS,
  MODEL,
  THINKING,
  buildCoachTurn,
  claude,
  coachErrorMessage,
  isConfigured,
  parseCoachRequest,
} from "@/lib/prompts";
import {
  createControlSplitter,
  encodeEvent,
  parseControl,
  type CoachEvent,
} from "@/lib/prompts/protocol";

/**
 * The four coach surfaces: hint, requirements, tradeoff, diagnose.
 *
 * Streams newline-delimited JSON rather than plain text, because one turn
 * carries two things — prose the student reads as it lands, and a control
 * object the reducer acts on. Failures are events too, so the client parses one
 * format whatever happens.
 *
 * Nothing here judges whether code is correct. That is `/api/run`, and only
 * `/api/run` (ADR-0005).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("That request was not readable. Try again.", 400);
  }

  const parsed = parseCoachRequest(body);
  if (!parsed.ok) return errorResponse(parsed.detail, 400);

  if (!isConfigured()) {
    return errorResponse(
      "The coach is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
      503
    );
  }

  const { system, messages } = buildCoachTurn(parsed.request);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: CoachEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The student navigated away mid-answer. Stop, quietly.
          open = false;
        }
      };

      const splitter = createControlSplitter();

      try {
        const turn = claude().messages.stream({
          model: MODEL,
          max_tokens: MAX_COACH_TOKENS,
          thinking: THINKING,
          system,
          messages,
        });

        for await (const event of turn) {
          if (!open) break;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const prose = splitter.push(event.delta.text);
            if (prose) send({ type: "delta", text: prose });
          }
        }

        const { prose, control } = splitter.finish();
        if (prose) send({ type: "delta", text: prose });

        const final = await turn.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "error", message: "The coach declined to answer that. Try rephrasing it." });
        } else {
          send({ type: "control", control: parseControl(control) ?? {} });
        }
      } catch (error) {
        send({ type: "error", message: coachErrorMessage(error) });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** An error the student sees before any prose arrives, in the same event format. */
function errorResponse(message: string, status: number): Response {
  return new Response(encodeEvent({ type: "error", message }), {
    status,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
