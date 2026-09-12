import type { Phase } from "@/lib/state";

import { CheckIcon, LockIcon, PathNode } from "./PathNode";

/** The three named phases, never more (Miller's Law). */
const PHASES: { phase: Phase; label: string }[] = [
  { phase: "requirements", label: "Requirements" },
  { phase: "tradeoff", label: "Tradeoff" },
  { phase: "testing", label: "Tests" },
];

/**
 * The Project Checkpoint on the path. Once unlocked it takes the only accent
 * colour on the page, so it is the one thing that stands out (Von Restorff).
 */
export function CheckpointNode({ phase }: { phase: Phase }) {
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
      marker="★"
      title="Project Checkpoint"
      detail="Word-frequency counter"
      href="/checkpoint"
      className="border-violet-500 bg-violet-50 dark:bg-violet-950/40"
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
