"use client";

import { useState, type FormEvent } from "react";

import type { TradeoffOption } from "@/lib/prompts/protocol";
import { completedTopicIds, useProgress, type ProgressState, type Tier, type TopicId } from "@/lib/state";

import { PROJECT, TRADEOFF_DECISION, TRADEOFF_OPTIONS } from "./project";
import { Button, Notice, Region } from "./ui";
import { useCoach } from "./useCoach";

/**
 * The Tradeoff Phase: one decision, two options, and the student's reasoning.
 *
 * The screen asks the question, because it never changes; the coach judges the
 * reasoning, because that cannot be scripted. Weak reasoning costs one retry and
 * then the student moves on with the verdict shown beside their work — the model
 * is never what stops someone progressing (BUILD-SPEC, ADR-0006).
 *
 * Not a multiple choice with a right answer: both options are defensible, and
 * the irreducible part is the reasoning (Tesler's Law).
 */
export function TradeoffPhase({ tier }: { tier: Tier }) {
  const { state, dispatch } = useProgress();
  const coach = useCoach();
  const options = optionsFor(state);
  const attempt = state.checkpoint.tradeoff;

  const [choice, setChoice] = useState(attempt?.choice ?? options[0].id);
  const [reasoning, setReasoning] = useState(attempt?.reasoning ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stated = reasoning.trim();
    if (!stated || coach.pending) return;

    const answer = await coach.ask({
      surface: "tradeoff",
      tier,
      brief: PROJECT.brief,
      decision: TRADEOFF_DECISION,
      options,
      choice,
      reasoning: stated,
      retryUsed: attempt?.retryUsed ?? false,
      ...(attempt ? { previous: { reasoning: attempt.reasoning, verdict: attempt.verdict } } : {}),
    });
    if (!answer) return;

    dispatch({
      type: "evaluateTradeoff",
      choice,
      reasoning: stated,
      verdict: answer.text,
      sound: answer.control.sound === true,
    });
  }

  // Reached only when the first attempt was judged weak; the next one moves on
  // whatever the coach makes of it.
  const onLastAttempt = attempt?.retryUsed === true;

  return (
    <div className="space-y-6">
      <Region title="Tradeoff" hint={TRADEOFF_DECISION}>
        <fieldset className="space-y-3">
          <legend className="sr-only">{TRADEOFF_DECISION}</legend>
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                choice === option.id
                  ? "border-foreground"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <input
                type="radio"
                name="tradeoff"
                value={option.id}
                checked={choice === option.id}
                onChange={() => setChoice(option.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold">{option.label}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{option.summary}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Both of these work. The coach reads your reasoning, not your pick.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="reasoning" className="block font-semibold">
            Why that one, for this project?
          </label>
          <textarea
            id="reasoning"
            value={reasoning}
            onChange={(event) => setReasoning(event.target.value)}
            rows={5}
            placeholder="What does it cost to update a count, and what happens to that cost as the text gets longer?"
            className="w-full rounded-xl border border-zinc-400 bg-transparent p-4"
          />
          <Button disabled={coach.pending || !reasoning.trim()}>
            {coach.pending ? "The coach is reading…" : onLastAttempt ? "Send and move on" : "Send your reasoning"}
          </Button>
        </form>

        {coach.pending && !coach.streaming && (
          <p className="text-zinc-500 motion-safe:animate-pulse">Reading what you wrote…</p>
        )}
        {coach.streaming && <p className="whitespace-pre-wrap">{coach.streaming}</p>}
        {coach.error && <Notice tone="bad">{coach.error}</Notice>}
      </Region>

      {attempt && !coach.pending && !coach.streaming && (
        <Region title="What the coach said">
          <p className="whitespace-pre-wrap">{attempt.verdict}</p>
          <Notice>
            One more attempt on this, then you move on either way. Add what is missing and send it
            again.
          </Notice>
        </Region>
      )}
    </div>
  );
}

/**
 * The two options, drawn from Topics the student has completed (BUILD-SPEC).
 * Both Topics gate this Checkpoint, so the fallback is unreachable today — it is
 * here so that adding a third Topic cannot leave this phase with one option.
 */
function optionsFor(state: ProgressState): TradeoffOption[] {
  const fromCompleted = completedTopicIds(state)
    .filter((id): id is TopicId => id in TRADEOFF_OPTIONS)
    .map((id) => TRADEOFF_OPTIONS[id]);
  return fromCompleted.length >= 2 ? fromCompleted.slice(0, 2) : Object.values(TRADEOFF_OPTIONS);
}
