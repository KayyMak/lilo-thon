"use client";

import { useState } from "react";

import { CaseResults } from "@/components/results/CaseResults";
import type { CaseResult, RunOutcome, TestCase } from "@/lib/execution";
import type { FailingCase, GenerateResponse } from "@/lib/prompts/protocol";
import { useProgress, type Tier } from "@/lib/state";

import {
  EXAMPLE_TEST_CASE,
  PROJECT,
  TEST_SPEC_COLUMNS,
  TEST_SPEC_PLACEHOLDERS,
  checkTestCase,
} from "./project";
import { emptyRow, rowsFromSpec, specFromRows, type SpecRow } from "./testSpec";
import { Button, Composer, Notice, Region, Transcript } from "./ui";
import { useCoach } from "./useCoach";

/**
 * The Test-Driven Prompting Phase: tests first, then prompt, then run, then
 * prompt again with what the failure showed.
 *
 * The generated implementation is rendered read-only and there is nowhere to
 * edit it, on purpose. A surface that invited the student to fix a line by hand
 * would contradict Prompt, Don't Code — they fix it by prompting.
 */

type RunReply = RunOutcome | { ok: false; reason: "bad_request"; detail: string };

const RUN_TIMEOUT_MS = 60_000;
const GENERATE_TIMEOUT_MS = 90_000;

export function TestingPhase({ tier }: { tier: Tier }) {
  const { state, dispatch } = useProgress();
  const { checkpoint, language } = state;

  const [rows, setRows] = useState<SpecRow[]>(() => rowsFromSpec(checkpoint.testSpec));
  const [specError, setSpecError] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const diagnosis = useCoach();

  const { testSpec, generated, lastRun } = checkpoint;
  const results = lastRun?.ok ? lastRun.results : null;
  const failing = firstFailure(testSpec, results);

  function editRow(index: number, patch: Partial<SpecRow>) {
    setRows(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
    setUnsaved(true);
  }

  function saveSpec() {
    const parsed = specFromRows(rows, checkTestCase);
    if (!parsed.ok) {
      setSpecError(parsed.detail);
      return;
    }
    setSpecError(null);
    setUnsaved(false);
    // Changing the spec drops the last run: those verdicts were about other tests.
    dispatch({ type: "setTestSpec", testSpec: parsed.testSpec });
  }

  async function generate(instruction: string) {
    if (generating) return;
    setGenerating(true);
    setGenerateError(null);
    setRunError(null);

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), GENERATE_TIMEOUT_MS);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          language,
          entryPoint: PROJECT.entryPoint,
          brief: PROJECT.brief,
          requirements: checkpoint.requirements,
          testSpec,
          instruction,
          ...(generated ? { previous: { source: generated.source } } : {}),
        }),
      });
      const payload = (await response.json()) as GenerateResponse;
      if (!payload.ok) {
        setGenerateError(payload.detail);
        return;
      }
      dispatch({ type: "receiveGenerated", generated: { language, source: payload.source } });
    } catch {
      setGenerateError("The AI could not be reached. Check your connection and prompt again.");
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  }

  async function run() {
    if (!generated || !testSpec.length || running) return;
    setRunning(true);
    setRunError(null);

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), RUN_TIMEOUT_MS);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          language,
          source: generated.source,
          entryPoint: PROJECT.entryPoint,
          cases: testSpec,
        }),
      });
      const outcome = (await response.json()) as RunReply;

      if (!outcome.ok) {
        // Our own trouble, not the student's: keep it off their record.
        if (outcome.reason === "transport") {
          setRunError("The runner is unavailable. Your tests are saved; try again.");
          return;
        }
        if (outcome.reason === "bad_request") {
          setRunError(outcome.detail);
          return;
        }
        // The code itself would not run. That is a result, and it is theirs to fix.
        dispatch({ type: "recordRun", outcome });
        return;
      }

      if (outcome.results.length !== testSpec.length) throw new Error("incomplete response");
      dispatch({ type: "recordRun", outcome });
    } catch {
      setRunError("The run could not finish. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Region
        title="Your tests"
        hint={`Each row is one test: if ${PROJECT.signature} is called with this input, it should return this. Include the edge cases.`}
      >
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          {Object.values(TEST_SPEC_COLUMNS).map((column) => (
            <div key={column.heading}>
              <dt className="font-semibold">{column.heading}</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{column.format}</dd>
            </div>
          ))}
        </dl>

        <figure className="space-y-2 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Example test. Write your own below
          </figcaption>
          <div className={`grid gap-1 font-mono text-sm md:gap-3 ${ROW_COLUMNS}`}>
            <code>{EXAMPLE_TEST_CASE.input}</code>
            <code>{EXAMPLE_TEST_CASE.expected}</code>
            <span className="font-sans text-zinc-600 dark:text-zinc-400">{EXAMPLE_TEST_CASE.label}</span>
          </div>
        </figure>

        <div
          aria-hidden
          className={`hidden gap-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid ${ROW_COLUMNS}`}
        >
          <span>{TEST_SPEC_COLUMNS.input.heading}</span>
          <span>{TEST_SPEC_COLUMNS.expected.heading}</span>
          <span>{TEST_SPEC_COLUMNS.label.heading}</span>
        </div>
        <ol className="space-y-4">
          {rows.map((row, index) => (
            <li key={index} className={`grid gap-3 ${ROW_COLUMNS}`}>
              <SpecField
                label={`Case ${index + 1}: ${TEST_SPEC_COLUMNS.input.heading}`}
                value={row.input}
                placeholder={TEST_SPEC_PLACEHOLDERS.input}
                onChange={(input) => editRow(index, { input })}
              />
              <SpecField
                label={`Case ${index + 1}: ${TEST_SPEC_COLUMNS.expected.heading}`}
                value={row.expected}
                placeholder={TEST_SPEC_PLACEHOLDERS.expected}
                onChange={(expected) => editRow(index, { expected })}
              />
              <SpecField
                label={`Case ${index + 1}: ${TEST_SPEC_COLUMNS.label.heading}`}
                value={row.label}
                placeholder={TEST_SPEC_PLACEHOLDERS.label}
                onChange={(label) => editRow(index, { label })}
              />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={saveSpec}>
            {testSpec.length && !unsaved ? "Tests saved" : "Save my tests"}
          </Button>
          <button
            type="button"
            onClick={() => setRows([...rows, emptyRow()])}
            className="underline"
          >
            Add a case
          </button>
          {testSpec.length > 0 && !unsaved && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {testSpec.length} {testSpec.length === 1 ? "case" : "cases"} ready to run.
            </span>
          )}
        </div>
        {specError && <Notice tone="bad">{specError}</Notice>}
        {unsaved && testSpec.length > 0 && (
          <Notice>Save your tests to run the new version.</Notice>
        )}
      </Region>

      <Region
        title="Prompt for the implementation"
        hint="Describe the behaviour you want and the AI rewrites the code. It only writes code: it can't answer questions, and it keeps working code unless you ask for a change."
      >
        {testSpec.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Save at least one test case first — your tests are the specification.
          </p>
        ) : (
          <Composer
            label={generated ? "What should change?" : "What should it build?"}
            placeholder={
              generated
                ? "Ties should be broken by the word that appears first in the text."
                : `Write ${PROJECT.signature} so it passes my tests.`
            }
            submitLabel={generated ? "Send this prompt" : "Generate the implementation"}
            pendingLabel="Writing the implementation…"
            pending={generating}
            onSubmit={generate}
          />
        )}
        {generateError && <Notice tone="bad">{generateError}</Notice>}
        {generating && (
          <p className="text-zinc-500 motion-safe:animate-pulse">
            Writing the implementation in {language}…
          </p>
        )}
        {generated && !generating && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              The AI wrote this. You direct it; you never edit it.
            </p>
            <pre className="max-h-96 overflow-auto rounded-xl border border-zinc-300 p-4 font-mono text-sm dark:border-zinc-700">
              {generated.source}
            </pre>
          </div>
        )}
      </Region>

      <Region title="Run them">
        <Button type="button" disabled={!generated || running || !testSpec.length} onClick={run}>
          {running ? "Running your tests…" : "Run my tests"}
        </Button>
        {!generated && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nothing to run yet. Prompt for an implementation first.
          </p>
        )}
        {runError && <Notice tone="bad">{runError}</Notice>}
        {lastRun && !lastRun.ok && (
          <Notice tone="bad">
            {lastRun.reason === "entry_point_not_found"
              ? `The code never defined ${PROJECT.entryPoint}. Prompt again and name the function.`
              : `The code did not run: ${lastRun.detail}. Prompt again with that.`}
          </Notice>
        )}
        {(generated || results) && (
          <CaseResults cases={testSpec} results={results} pending={running} />
        )}

        {failing && (
          <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              disabled={diagnosis.pending}
              onClick={() =>
                diagnosis.ask(
                  {
                    surface: "diagnose",
                    tier,
                    language,
                    brief: PROJECT.brief,
                    source: generated?.source ?? "",
                    failing,
                  },
                  `Why did "${failing.label ?? "that case"}" fail?`
                )
              }
            >
              {diagnosis.pending ? "Asking the coach…" : "Ask what this failure means"}
            </Button>
            <Transcript
              turns={diagnosis.turns}
              streaming={diagnosis.streaming}
              pending={diagnosis.pending}
            />
            {diagnosis.error && <Notice tone="bad">{diagnosis.error}</Notice>}
          </div>
        )}
      </Region>
    </div>
  );
}

function SpecField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    // The column headings carry the label on wide screens; on narrow ones the
    // columns stack, so each field shows its own.
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-zinc-500 md:sr-only">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full rounded-xl border border-zinc-400 bg-transparent p-3 font-mono text-sm"
      />
    </label>
  );
}

/** Shared by the example, the headings and the rows, so the three line up. */
const ROW_COLUMNS = "md:grid-cols-[1fr_1fr_10rem]";

/** The first case the runner marked failed, paired with what it expected. */
function firstFailure(testSpec: TestCase[], results: CaseResult[] | null): FailingCase | null {
  if (!results) return null;
  const index = results.findIndex((result) => !result.passed);
  if (index === -1) return null;
  const testCase = testSpec[index];
  const result = results[index];
  if (!testCase) return null;
  return {
    input: testCase.input,
    expected: testCase.expected,
    ...(testCase.label ? { label: testCase.label } : {}),
    ...("actual" in result ? { actual: result.actual } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}
