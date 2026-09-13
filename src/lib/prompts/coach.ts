import type Anthropic from "@anthropic-ai/sdk";

import type { Tier } from "@/lib/state";

import { CONTROL_MARKER, type ChatTurn, type CoachRequest, type FailingCase } from "./protocol";

/**
 * Every system prompt the coach runs on. One per surface, each deliberately
 * short (BUILD-SPEC, AI surfaces).
 *
 * Two rules run through all of them, and both come from ADRs. The coach never
 * decides whether code is correct — the runner already did, and the coach's job
 * is to explain what it found (ADR-0005). And the coach never explains a data
 * structure; that is NeetCode's job, and writing it here is the exact failure
 * ADR-0002 exists to prevent.
 */

/**
 * Tier's whole reach into the coach: one line about how much to scaffold before
 * leaving the student to struggle (BUILD-SPEC, Tier).
 */
const TIER_SCAFFOLDING: Record<Tier, string> = {
  beginner:
    "This student is at Beginner Tier. Offer the first step concretely and name the kind of thing to look at, then let them take it.",
  intermediate:
    "This student is at Intermediate Tier. Ask first, and narrow only if their next reply is still stuck.",
  advanced: "This student is at Advanced Tier. One question, no narrowing. Let them struggle.",
};

/** How to close a turn that carries a decision the reducer acts on. */
function controlLine(shape: string, note: string): string {
  return [
    "End every reply with a line of exactly this form:",
    `${CONTROL_MARKER} ${shape}`,
    note,
    "Write nothing after that line, and never mention it to the student.",
  ].join("\n");
}

const HINT = `You are a coach on lilo-thon. A student is stuck on a Practice Problem and wants to keep going on their own.

Hard rules:
- Never state the answer. Never write code, pseudocode, or a line of a solution.
- At most three sentences, ending in one question that moves them forward.
- If they are stuck on the concept rather than on this problem, send them back to the Topic on NeetCode. lilo-thon does not teach data structures.
- If a failing case is given, say what that case shows. Do not say what to change.`;

const REQUIREMENTS = `You are a coach on lilo-thon running the Requirements Phase of a Project Checkpoint. The student says what the project must do, before any code exists.

Your job is to turn vague statements into checkable ones. "Handles punctuation" is vague; "strips trailing commas and periods before counting" is checkable. Push on the edge cases this project really has: ties, empty input, casing, punctuation.

Hard rules:
- Never propose an implementation, an algorithm, or a data structure. That decision is the next phase and it belongs to the student.
- Never write code.
- At most four sentences, and ask about one thing at a time.
- Accept a statement by echoing it in the control line as one concrete sentence, in the student's own terms.
- The phase is ready once at least three concrete behaviours and one named edge case have been accepted.

${controlLine(
  '{"accepted": ["..."], "ready": false}',
  '"accepted" lists only what you accepted in THIS reply, an empty array if nothing; "ready" is true only when the bar above is met.'
)}`;

const TRADEOFF = `You are a coach on lilo-thon running the Tradeoff Phase. The student has been shown one design decision with two options and has picked one. Both options are defensible, and neither is the answer you are waiting for.

You evaluate their REASONING, never their choice. Sound reasoning names a concrete consequence for this project: what an operation costs, how that cost changes as the input grows, or what the other option would cost instead. Weak reasoning restates the choice, calls something faster or better with no reason, or credits the option with something it does not do.

Hard rules:
- At most four sentences. Say what is strong; if it is weak, say exactly what is missing.
- Never write code, and never explain what an array or a hash map is. That is on NeetCode.
- Never tell them they picked the wrong option. There is no wrong option here.`;

const DIAGNOSE = `You are a coach on lilo-thon. Code the AI generated has failed a test the student wrote, and they are about to prompt for a fix.

The failure is already settled: the code was run against their test case and the runner reported the result. You explain it. You did not decide it and you cannot overrule it.

Hard rules:
- Never rewrite the code and never hand over a corrected line. The student fixes this by prompting again — that is the skill being practised.
- Say where the behaviour and the expectation part company: what the case expected, what came back, and which part of the code produces that.
- At most four sentences. Finish by naming what their next prompt has to ask for, without writing the prompt for them.`;

/** Recent turns only, so a long conversation cannot slow the next reply down. */
const TRANSCRIPT_LIMIT = 12;

function transcript(turns: ChatTurn[], opening: string): Anthropic.MessageParam[] {
  const recent: Anthropic.MessageParam[] = turns
    .slice(-TRANSCRIPT_LIMIT)
    .map((turn) => ({ role: turn.role, content: turn.content }));
  // The API requires the first turn to be the student's.
  if (recent.length === 0 || recent[0].role !== "user") {
    return [{ role: "user", content: opening }, ...recent];
  }
  return recent;
}

function describeCase(failing: FailingCase): string {
  const lines = [
    `- case: ${failing.label ?? "unlabelled"}`,
    `- input: ${JSON.stringify(failing.input)}`,
    `- expected: ${JSON.stringify(failing.expected)}`,
  ];
  if (failing.error) lines.push(`- it raised: ${failing.error}`);
  else lines.push(`- it returned: ${JSON.stringify(failing.actual) ?? "nothing"}`);
  return lines.join("\n");
}

function section(title: string, body: string): string {
  return `\n\n${title}\n${body}`;
}

/**
 * Turns one request into the system prompt and messages for a single model
 * call. Everything the coach needs to know about the student's state is
 * operator context and goes in the system prompt, so `messages` stays the
 * student's own conversation and nothing else.
 */
export function buildCoachTurn(request: CoachRequest): {
  system: string;
  messages: Anthropic.MessageParam[];
} {
  const tier = TIER_SCAFFOLDING[request.tier];

  switch (request.surface) {
    case "hint": {
      let system =
        `${HINT}\n\n${tier}` +
        section(
          "The student is working on:",
          `- Topic: ${request.topic}\n- Practice Problem: ${request.problem} (${request.problemUrl})\n- Language: ${request.language}`
        );
      if (request.failing) {
        system += section("Their latest run failed this case:", describeCase(request.failing));
      }
      return { system, messages: transcript(request.messages, "I am stuck on this problem.") };
    }

    case "requirements": {
      const accepted = request.accepted.length
        ? request.accepted.map((statement, index) => `${index + 1}. ${statement}`).join("\n")
        : "Nothing yet.";
      const system =
        `${REQUIREMENTS}\n\n${tier}` +
        section("The project:", request.brief) +
        section("Already accepted:", accepted);
      return {
        system,
        messages: transcript(request.messages, "Here is what the project should do."),
      };
    }

    case "tradeoff": {
      const options = request.options
        .map((option) => `- ${option.label}: ${option.summary}`)
        .join("\n");
      let system =
        `${TRADEOFF}\n\n${tier}` +
        section("The project:", request.brief) +
        section("The decision they were given:", `${request.decision}\n${options}`);

      if (request.previous) {
        system += section(
          "Their first attempt, and what you told them:",
          `- reasoning: ${request.previous.reasoning}\n- your verdict: ${request.previous.verdict}`
        );
      }

      // The model is never the thing that stops a student (BUILD-SPEC, ADR-0006).
      system += section(
        "How this turn ends:",
        request.retryUsed
          ? "This was their second attempt and they move on either way. Judge it honestly — your verdict is shown beside their results — and write it as something to carry into the next phase."
          : "If the reasoning is weak, set sound to false. They get exactly one more attempt, and your feedback is what they work from."
      );
      system += `\n\n${controlLine(
        '{"sound": true}',
        '"sound" is your judgment of the reasoning alone, never of the choice.'
      )}`;

      return {
        system,
        messages: [{ role: "user", content: `I chose ${request.choice}.\n\n${request.reasoning}` }],
      };
    }

    case "diagnose": {
      const system =
        `${DIAGNOSE}\n\n${tier}` +
        section("The project:", request.brief) +
        section("The failing case:", describeCase(request.failing)) +
        section(
          `The code that was run (${request.language}), which you must not rewrite:`,
          request.source
        );
      return { system, messages: transcript(request.messages, "Why did that test fail?") };
    }
  }
}
