import type { CaseResult, TestCase } from "@/lib/execution";

export function CaseResults({ cases, results, pending }: {
  cases: TestCase[];
  results: CaseResult[] | null;
  pending: boolean;
}) {
  return (
    <section aria-label="Test results" aria-busy={pending} className="space-y-3">
      <h2 className="text-xl font-semibold">Test cases</h2>
      <p role="status">{pending ? "Running your solution…" : results ? `${results.filter((result) => result.passed).length} of ${cases.length} passed` : "Ready to run"}</p>
      <ol className="space-y-3">
        {cases.map((test, index) => {
          const result = results?.[index];
          return (
            <li key={index} className="rounded-xl border border-zinc-300 p-4 dark:border-zinc-700">
              <div className="flex justify-between gap-4">
                <span className="font-medium">{test.label ?? `Case ${index + 1}`}</span>
                <span>{pending ? "Running…" : result ? result.passed ? "Pass" : "Fail" : "Not run"}</span>
              </div>
              {pending ? <div aria-hidden="true" className="mt-3 h-6 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" /> : (
                <div className="mt-2 space-y-1 break-words font-mono text-sm">
                  <p>Input: {JSON.stringify(test.input)}</p>
                  <p>Expected: {JSON.stringify(test.expected)}</p>
                  {result && <p>{result.error ? `Error: ${result.error}` : `Actual: ${JSON.stringify(result.actual) ?? "No value returned"}`}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
