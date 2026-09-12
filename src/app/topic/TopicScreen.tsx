"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { CaseResults } from "@/components/results/CaseResults";
import { arraysProblems, type PracticeProblem } from "@/content/arrays";
import type { CaseResult, Language, RunOutcome } from "@/lib/execution";
import { useProgress } from "@/lib/state";

import { prepareSource } from "./prepareSource";
import { hashingProblems } from "@/content/hashing";

type TopicId = "arrays" | "hashing";

export function TopicScreen({ topicId }: { topicId: TopicId }) {
  const title = topicId === "arrays" ? "Arrays" : "Hashing";
  const { state, hydrated } = useProgress();
  if (!hydrated) return <main className="mx-auto w-full max-w-3xl p-8" role="status">Loading your progress…</main>;
  if (!state.tier) return <main className="mx-auto w-full max-w-3xl space-y-4 p-8"><h1 className="text-3xl font-semibold">Start with your Tier</h1><Link className="underline" href="/onboarding">Complete onboarding to open {title}</Link></main>;
  if (state.topics[topicId].status === "locked") return <main className="p-8">{title} is locked. <Link href="/topic/arrays" className="underline">Complete Arrays first</Link></main>;
  const problem = (topicId === "arrays" ? arraysProblems : hashingProblems)[state.tier];
  return <TopicRunner topicId={topicId} key={`${problem.id}:${state.language}`} problem={problem} language={state.language} />;
}

function TopicRunner({ topicId, problem, language }: { topicId: TopicId; problem: PracticeProblem; language: Language }) {
  const { state, dispatch } = useProgress();
  const draftKey = `lilo-thon:topic-draft:${problem.id}:${language}`;
  // This component mounts only after the progress provider hydrates in the browser.
  const [source, setSource] = useState(() => {
    try {
      return localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [draftError, setDraftError] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  function updateSource(value: string) {
    setSource(value);
    setResults(null);
    setError(null);
    try {
      // Save on input so even an immediate refresh preserves the latest paste.
      if (value === "") localStorage.removeItem(draftKey);
      else localStorage.setItem(draftKey, value);
      setDraftError(false);
    } catch {
      setDraftError(true);
    }
  }

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source.trim() || running.current) return;
    running.current = true;
    setPending(true);
    setResults(null);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ language, source: prepareSource(source, language, problem.entryPoint), entryPoint: problem.entryPoint, cases: problem.cases }),
      });
      const outcome: RunOutcome | { ok: false; reason: "bad_request"; detail: string } = await response.json();
      if (!outcome.ok) {
        setError(outcome.reason === "transport" ? "The runner is unavailable. Your solution is saved here; try again." : outcome.detail);
        return;
      }
      if (!response.ok || !Array.isArray(outcome.results) || outcome.results.length !== problem.cases.length) {
        throw new Error("Incomplete response");
      }
      setResults(outcome.results);
      if (outcome.results.every((result) => result.passed === true)) {
        dispatch({ type: "solveProblem", topicId, problemId: problem.id });
      }
    } catch {
      setError("The run could not finish. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
      running.current = false;
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <Link href="/" className="underline">Back to your path</Link>
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide">{topicId === "arrays" ? "Arrays" : "Hashing"} · {state.tier}</p>
        <h1 className="text-3xl font-semibold">{problem.title}</h1>
        <p>Open the Practice Problem, then return here with your solution.</p>
        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="inline-block underline">Open NeetCode (new tab)</a>
      </header>
      <form onSubmit={run} className="space-y-3">
        <label htmlFor="solution" className="block font-semibold">Paste your {language === "python" ? "Python" : "JavaScript"} solution</label>
        <p id="solution-help" className="text-sm">Paste the complete solution, including its function or Solution class.</p>
        <textarea id="solution" aria-describedby="solution-help" value={source} readOnly={pending} onChange={(event) => updateSource(event.target.value)} rows={12} spellCheck={false} autoCapitalize="off" autoCorrect="off" className="w-full rounded-xl border border-zinc-400 bg-transparent p-4 font-mono text-sm" />
        {draftError && <p role="alert" className="text-sm">Your browser could not save this draft. Copy your solution before refreshing.</p>}
        <button type="submit" disabled={pending || !source.trim()} className="rounded-full bg-foreground px-6 py-3 text-background disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Running tests…" : "Run tests"}</button>
      </form>
      {error && <p role="alert" className="rounded-xl border border-red-400 p-4">{error}</p>}
      <CaseResults cases={problem.cases} results={results} pending={pending} />
      {state.topics[topicId].status === "complete" && <div role="status" className="space-y-2 rounded-xl border border-emerald-500 p-5"><p className="font-semibold">{topicId === "arrays" ? "Arrays complete. Hashing is unlocked!" : "Hashing complete. Your Project Checkpoint is unlocked!"}</p>{topicId === "arrays" ? <Link href="/topic/hashing" className="underline">Continue to Hashing</Link> : <Link href="/" className="underline">Return to your path</Link>}</div>}
    </main>
  );
}
