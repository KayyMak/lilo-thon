"use client";

import { useState } from "react";

import { useProgress, type Tier } from "@/lib/state";

import { PROJECT } from "./project";
import { Button, Composer, Notice, Region, Transcript } from "./ui";
import { useCoach } from "./useCoach";

/**
 * The Requirements Phase: the student says what the project must do, before any
 * code exists, and the coach refuses to accept anything a test could not check.
 *
 * The phase closes when the coach says it is ready — or once three behaviours
 * are on the board, whichever comes first. The second half of that is
 * deliberate: a model holding a student on this screen is the one failure this
 * flow cannot afford.
 */
const ENOUGH_BEHAVIOURS = 3;

export function RequirementsPhase({ tier }: { tier: Tier }) {
  const { state, dispatch } = useProgress();
  const coach = useCoach();
  const [coachSaysReady, setCoachSaysReady] = useState(false);

  const accepted = state.checkpoint.requirements;
  const canContinue = coachSaysReady || accepted.length >= ENOUGH_BEHAVIOURS;

  async function send(statement: string) {
    const answer = await coach.ask(
      {
        surface: "requirements",
        tier,
        brief: PROJECT.brief,
        accepted,
      },
      statement
    );
    if (!answer) return;

    const seen = new Set(accepted.map(normalise));
    for (const newStatement of readAccepted(answer.control)) {
      if (seen.has(normalise(newStatement))) continue;
      seen.add(normalise(newStatement));
      dispatch({ type: "acceptRequirement", statement: newStatement });
    }
    if (answer.control.ready === true) setCoachSaysReady(true);
  }

  return (
    <div className="space-y-6">
      <Region
        title="Requirements"
        hint={`Say what ${PROJECT.signature} has to do, one behaviour at a time. Name the edge cases too — ties, empty text, casing, punctuation.`}
      >
        <Transcript turns={coach.turns} streaming={coach.streaming} pending={coach.pending} />
        {coach.error && <Notice tone="bad">{coach.error}</Notice>}
        <Composer
          label="What must it do?"
          placeholder="Words are counted without case mattering, so The and the are the same word."
          submitLabel="Send to the coach"
          pendingLabel="Sending…"
          pending={coach.pending}
          onSubmit={send}
        />
      </Region>

      <Region
        title="Accepted so far"
        hint={
          canContinue
            ? "Enough to build from. You can keep going, or move on."
            : `${accepted.length} of ${ENOUGH_BEHAVIOURS} concrete behaviours, plus an edge case.`
        }
      >
        {accepted.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Nothing accepted yet.</p>
        ) : (
          <ol className="list-decimal space-y-2 pl-5">
            {accepted.map((statement, index) => (
              <li key={index}>{statement}</li>
            ))}
          </ol>
        )}
        <Button
          type="button"
          disabled={!canContinue || coach.pending}
          onClick={() => dispatch({ type: "finishRequirements" })}
        >
          Move on to the tradeoff
        </Button>
      </Region>
    </div>
  );
}

/** The coach's accepted statements, taken from the control object defensively. */
function readAccepted(control: Record<string, unknown>): string[] {
  if (!Array.isArray(control.accepted)) return [];
  return control.accepted
    .filter((statement): statement is string => typeof statement === "string")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalise(statement: string): string {
  return statement.toLowerCase().replace(/\s+/g, " ").trim();
}
