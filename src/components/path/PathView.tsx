"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  TOPIC_IDS,
  isOnboarded,
  topicsUntilCheckpoint,
  useProgress,
  type Phase,
  type ProgressState,
  type TopicId,
  type TopicStatus,
} from "@/lib/state";

import { CheckpointNode } from "./CheckpointNode";
import { CheckIcon, LockIcon, PathNode } from "./PathNode";

/** Display names only. What a Topic teaches lives on NeetCode, never here (ADR-0002). */
const TOPIC_TITLES: Record<TopicId, string> = {
  arrays: "Arrays",
  hashing: "Hashing",
};

/**
 * The student's path: Topics, then the Project Checkpoint, joined by a line so
 * it reads as a sequence rather than a list. Locked steps stay on screen, so
 * something is always visibly unfinished (Zeigarnik Effect).
 */
export function PathView() {
  const router = useRouter();
  const { state, hydrated } = useProgress();
  const onboarded = isOnboarded(state);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace("/onboarding");
  }, [hydrated, onboarded, router]);

  // Until stored progress is read, state is the initial state; rendering it
  // would flash a fresh path at a returning student.
  if (!hydrated || !onboarded) return null;

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-6 py-12 md:grid-cols-[22rem_1fr]">
      <section aria-label="Your path" className="flex flex-col gap-6">
        <PathHeader state={state} />
        <ol className="relative flex flex-col gap-4">
          {/* The connecting line, behind the node markers. */}
          <span aria-hidden className="absolute top-6 bottom-6 left-6 w-px bg-zinc-200 dark:bg-zinc-800" />
          {TOPIC_IDS.map((id, index) => (
            <TopicNode key={id} id={id} index={index} status={state.topics[id]?.status ?? "locked"} />
          ))}
          <CheckpointNode phase={state.checkpoint.phase} />
        </ol>
      </section>

      <NextStep state={state} />
    </main>
  );
}

function PathHeader({ state }: { state: ProgressState }) {
  const remaining = topicsUntilCheckpoint(state);
  const steps = TOPIC_IDS.length + 1;
  const done =
    TOPIC_IDS.filter((id) => state.topics[id]?.status === "complete").length +
    (state.checkpoint.phase === "complete" ? 1 : 0);

  // State the distance explicitly; the goal has to look close (Goal-Gradient Effect).
  const distance =
    state.checkpoint.phase === "complete"
      ? "Project complete"
      : remaining > 0
        ? `${remaining} ${remaining === 1 ? "Topic" : "Topics"} until your first Project`
        : "Your first Project is unlocked";

  return (
    <header className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        <span className="capitalize">{state.tier}</span> Tier
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{distance}</h1>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps}
        aria-valuenow={done}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-500"
          style={{ width: `${(done / steps) * 100}%` }}
        />
      </div>
    </header>
  );
}

function TopicNode({ id, index, status }: { id: TopicId; index: number; status: TopicStatus }) {
  const title = TOPIC_TITLES[id];
  const detail =
    status === "complete"
      ? "Complete"
      : status === "unlocked"
        ? "Solve a Practice Problem"
        : `Unlocks after ${TOPIC_TITLES[TOPIC_IDS[index - 1]]}`;

  return (
    <PathNode
      marker={status === "complete" ? <CheckIcon /> : status === "locked" ? <LockIcon /> : index + 1}
      title={title}
      detail={detail}
      href={status === "locked" ? undefined : `/topic/${id}`}
      muted={status === "locked"}
    />
  );
}

const PHASE_ROUTES: Partial<Record<Phase, string>> = {
  requirements: "/checkpoint",
  tradeoff: "/checkpoint",
  testing: "/checkpoint",
};

function NextStep({ state }: { state: ProgressState }) {
  const nextTopic = TOPIC_IDS.find((id) => state.topics[id]?.status === "unlocked");
  const phaseRoute = PHASE_ROUTES[state.checkpoint.phase];

  let heading: string;
  let body: string;
  let action: { href: string; label: string } | null = null;

  if (phaseRoute) {
    heading = "Your Project Checkpoint";
    body =
      "Build a word-frequency counter by directing the AI: state the requirements, reason through a tradeoff, then write the tests it has to pass.";
    action = { href: phaseRoute, label: state.checkpoint.requirements.length ? "Continue project" : "Start project" };
  } else if (nextTopic) {
    heading = `Up next: ${TOPIC_TITLES[nextTopic]}`;
    body =
      "Learn it and solve a Practice Problem on NeetCode, then bring your solution back here to run it.";
    action = { href: `/topic/${nextTopic}`, label: `Open ${TOPIC_TITLES[nextTopic]}` };
  } else {
    heading = "Path complete";
    body = "You finished every Topic and your first Project. More Topics are on the way.";
  }

  return (
    <aside className="flex flex-col justify-center gap-4 rounded-3xl bg-zinc-50 p-8 dark:bg-zinc-900 md:p-12">
      <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-2 self-start rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-85"
        >
          {action.label}
        </Link>
      )}
    </aside>
  );
}
