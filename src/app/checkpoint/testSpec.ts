import type { TestCase } from "@/lib/execution";

/**
 * The Test Specification, read from and written back to the editor's rows.
 *
 * A Test Specification is data — inputs, expected outputs, named edge cases —
 * never test code in a particular language (ADR-0003). The student types it, so
 * this file is liberal about how (Postel's Law): a JSON array, a bare
 * comma-separated argument list, single quotes, or an unquoted word all read the
 * same way. Rejecting a nearly-right row would stall the demo for nothing.
 */

export type SpecRow = { label: string; input: string; expected: string };

/** Three rows to start, because the phase asks for three behaviours. */
export const STARTING_ROWS = 3;

export function emptyRow(): SpecRow {
  return { label: "", input: "", expected: "" };
}

/** Parses JSON, or reports that it is not JSON. Single quotes are tolerated. */
function asJson(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    // Not JSON yet.
  }
  if (text.includes("'")) {
    try {
      return { value: JSON.parse(text.replace(/'/g, '"')) };
    } catch {
      // Still not JSON.
    }
  }
  return null;
}

/** Splits on commas that are not inside a string, an array or an object. */
function splitArguments(text: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";

  for (const character of text) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }
    if (character === "[" || character === "{") depth += 1;
    if (character === "]" || character === "}") depth -= 1;
    if (character === "," && depth === 0) {
      pieces.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  pieces.push(current);
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}

/** One value: JSON if it parses, otherwise the text itself as a string. */
export function parseValue(raw: string): unknown {
  const text = raw.trim();
  const json = asJson(text);
  if (json) return json.value;
  return text.replace(/^["']|["']$/g, "");
}

/** The positional arguments the entry point is called with. */
export function parseArguments(raw: string): unknown[] {
  const text = raw.trim();
  if (!text) return [];

  const json = asJson(text);
  if (json && Array.isArray(json.value)) return json.value;

  const wrapped = asJson(`[${text}]`);
  if (wrapped && Array.isArray(wrapped.value)) return wrapped.value;

  return splitArguments(text).map(parseValue);
}

export function formatArguments(input: unknown[]): string {
  return input.map((argument) => JSON.stringify(argument)).join(", ");
}

/** Rows for the editor, padded out so there is always somewhere to type. */
export function rowsFromSpec(testSpec: TestCase[]): SpecRow[] {
  const rows = testSpec.map((testCase) => ({
    label: testCase.label ?? "",
    input: formatArguments(testCase.input),
    expected: JSON.stringify(testCase.expected) ?? "",
  }));
  while (rows.length < STARTING_ROWS) rows.push(emptyRow());
  return rows;
}

export type SpecResult = { ok: true; testSpec: TestCase[] } | { ok: false; detail: string };

/**
 * Reads the editor back into a Test Specification. Blank rows are dropped; a
 * half-finished one is an error, because silently ignoring it would run fewer
 * tests than the student thinks they wrote.
 */
export function specFromRows(rows: SpecRow[]): SpecResult {
  const testSpec: TestCase[] = [];

  for (const [index, row] of rows.entries()) {
    const input = row.input.trim();
    const expected = row.expected.trim();
    const label = row.label.trim();
    if (!input && !expected) continue;

    if (!input) return { ok: false, detail: `Case ${index + 1} needs an input.` };
    if (!expected) return { ok: false, detail: `Case ${index + 1} needs an expected value.` };

    const parsedInput = parseArguments(input);
    if (!parsedInput.length) return { ok: false, detail: `Case ${index + 1} needs an input.` };

    testSpec.push({
      input: parsedInput,
      expected: parseValue(expected),
      ...(label ? { label } : {}),
    });
  }

  if (!testSpec.length) return { ok: false, detail: "Write at least one test case." };
  return { ok: true, testSpec };
}
