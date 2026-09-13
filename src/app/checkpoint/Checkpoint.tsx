"use client";

import Link from "next/link";

import { CaseResults } from "@/components/results/CaseResults";
import { useProgress, type Phase, type ProgressState, type Tier } from "@/lib/state";

import { PROJECT } from "./project";
import { RequirementsPhase } from "./RequirementsPhase";
import { TestingPhase } from "./TestingPhase";
import { TradeoffPhase } from "./TradeoffPhase";
import { Notice, Region } from "./ui";

/**
 * The Project Checkpoint: the student directs the AI instead of writing the
 * implementation, and the tests they wrote decide when it is done.
 *
 * Three named phases, never more (Miller's Law), with the rail on the left and
 * the work on the right — the shape of every AI tool a judge has used this year
 * (Jakob's Law).
 */
const PHASES: { phase: Phase; label: string }[] = [
  { phase: "requirements", label: "Requirements" },
  { phase: "tradeoff", label: "Tradeoff" },
  { phase: "testing", label: "Tests" },
];

export function Checkpoint() {
  const { state, hydrated } = useProgress();

  // Until stored progress is read, state is the initial state; acting on it
  // would send a returning student back to the start of the project.
  if (!hydrated) {
    return (
      <Gate>
        <p role="status">Loading your progress…</p>
      </Gate>
    );
  }

  if (!state.tier) {
    return (
      <Gate>
        <h1 className="text-3xl font-semibold tracking-tight">Start with your Tier</h1>
        <Link href="/onboarding" className="underline">
          Complete onboarding to open your first Project
        </Link>
      </Gate>
    );
  }

  if (state.checkpoint.phase === "locked") {
    return (
      <Gate>
        <h1 className="text-3xl font-semibold tracking-tight">Your Project is still locked</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Clear Arrays and Hashing first. Both of them are what the tradeoff in this project is
          about.
        </p>
        <Link href="/" className="underline">
          Back to your path
        </Link>
      </Gate>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 py-12 md:grid-cols-[19rem_1fr]">
      <Rail state={state} />
      <div>
        <Body state={state} tier={state.tier} />
      </div>
    </main>
  );
}

function Body({ state, tier }: { state: ProgressState; tier: Tier }) {
  switch (state.checkpoint.phase) {
    case "requirements":
      return <RequirementsPhase tier={tier} />;
    case "tradeoff":
      return <TradeoffPhase tier={tier} />;
    case "testing":
      return <TestingPhase tier={tier} />;
    default:
      return <Complete state={state} />;
  }
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      {children}
    </main>
  );
}

function Rail({ state }: { state: ProgressState }) {
  const { phase, requirements, tradeoff } = state.checkpoint;
  const current = PHASES.findIndex((step) => step.phase === phase);

  return (
    <aside className="flex flex-col gap-6">
      <Link href="/" className="underline">
        Back to your path
      </Link>

      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Project Checkpoint
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{PROJECT.title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{PROJECT.brief}</p>
      </header>

      <ol className="space-y-2">
        {PHASES.map((step, index) => {
          const done = phase === "complete" || index < current;
          return (
            <li
              key={step.phase}
              aria-current={index === current ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                index === current
                  ? "border-violet-500 bg-violet-50 font-medium dark:bg-violet-950/30"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              <span aria-hidden>{done ? "✓" : index + 1}</span>
              <span>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {requirements.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Your requirements
          </h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {requirements.map((statement, index) => (
              <li key={index}>{statement}</li>
            ))}
          </ol>
        </section>
      )}

      {tradeoff && phase !== "tradeoff" && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Your tradeoff
          </h2>
          <p className="text-sm">You chose {tradeoff.choice}.</p>
          {/* The verdict travels with the work, so the reasoning and the results
              can be read against each other (ADR-0006). */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{tradeoff.verdict}</p>
        </section>
      )}
    </aside>
  );
}

/**
 * The end of the demo, and one of the two moments it is remembered by
 * (Peak-End Rule). All green, and nothing else competing for the eye.
 */
function Complete({ state }: { state: ProgressState }) {
  const { testSpec, lastRun, generated } = state.checkpoint;
  const results = lastRun?.ok ? lastRun.results : null;

  return (
    <div className="space-y-6">
      <div
        role="status"
        className="space-y-2 rounded-3xl border border-emerald-500 bg-emerald-50 p-8 motion-safe:animate-unlock motion-reduce:animate-unlock-glow dark:bg-emerald-950/30"
      >
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Project complete
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Every test you wrote passes.
        </h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          You specified it, you decided the tradeoff, and you prompted until the code met your
          tests. You never wrote the implementation.
        </p>
      </div>

      <CaseResults cases={testSpec} results={results} pending={false} />

      {generated && (
        <Region title="What the AI wrote for you">
          <pre className="max-h-96 overflow-auto rounded-xl border border-zinc-300 p-4 font-mono text-sm dark:border-zinc-700">
            {generated.source}
          </pre>
        </Region>
      )}

      <Notice>
        More Topics and the next Project Checkpoint come after this one.{" "}
        <Link href="/" className="underline">
          Back to your path
        </Link>
      </Notice>
    </div>
  );
}
