"use client";

import { useEffect, useState } from "react";

import type { Phase } from "@/lib/state";

import { CheckIcon, LockIcon, PathNode } from "./PathNode";

/** The three named phases, never more (Miller's Law). */
const PHASES: { phase: Phase; label: string }[] = [
  { phase: "requirements", label: "Requirements" },
  { phase: "tradeoff", label: "Tradeoff" },
  { phase: "testing", label: "Tests" },
];

/**
 * Whether the student has already seen the unlock. A display flag, not
 * progress, so it stays out of ProgressState. Cleared whenever the Checkpoint
 * is locked, so a reset replays the animation on the next rehearsal.
 */
const UNLOCK_SEEN_KEY = "checkpoint-unlock-seen";

function hasSeenUnlock(): boolean {
  try {
    return window.localStorage.getItem(UNLOCK_SEEN_KEY) === "1";
  } catch {
    return true; // Storage blocked: skip the animation rather than replay it on every visit.
  }
}

/**
 * The Project Checkpoint on the path. Once unlocked it takes the only accent
 * colour on the page, so it is the one thing that stands out (Von Restorff).
 * The first time the student sees it unlocked, it animates in.
 *
 * Only rendered after progress has hydrated, so reading storage while
 * initialising state never runs on the server.
 */
export function CheckpointNode({ phase }: { phase: Phase }) {
  const [celebrate] = useState(() => phase !== "locked" && !hasSeenUnlock());

  useEffect(() => {
    try {
      if (phase === "locked") window.localStorage.removeItem(UNLOCK_SEEN_KEY);
      else window.localStorage.setItem(UNLOCK_SEEN_KEY, "1");
    } catch {
      // Nothing to remember it in; the animation simply may play again.
    }
  }, [phase]);

  if (phase === "locked") {
    return (
      <PathNode marker={<LockIcon />} title="Project Checkpoint" detail="Unlocks after Hashing" muted />
    );
  }

  if (phase === "complete") {
    return <PathNode marker={<CheckIcon />} title="Project Checkpoint" detail="Complete" href="/checkpoint" />;
  }

  const current = PHASES.findIndex((p) => p.phase === phase);

  return (
    <PathNode
      marker={<span className={celebrate ? "motion-safe:animate-unlock-marker" : ""}>★</span>}
      title="Project Checkpoint"
      detail={celebrate ? "Unlocked! Word-frequency counter" : "Word-frequency counter"}
      href="/checkpoint"
      className={`border-violet-500 bg-violet-50 dark:bg-violet-950/40 ${celebrate ? "motion-safe:animate-unlock motion-reduce:animate-unlock-glow" : ""}`}
      markerClassName="border-violet-600 bg-violet-600 text-white"
    >
      <span className="mt-1 flex gap-1.5 text-xs">
        {PHASES.map((p, index) => (
          <span
            key={p.phase}
            className={`rounded-full px-2 py-0.5 ${
              index === current
                ? "bg-violet-600 text-white"
                : index < current
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-zinc-500"
            }`}
          >
            {p.label}
          </span>
        ))}
      </span>
    </PathNode>
  );
}
