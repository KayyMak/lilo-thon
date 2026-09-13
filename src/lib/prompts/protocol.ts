import type { Language, TestCase } from "@/lib/execution";
import type { Tier } from "@/lib/state";

/**
 * The contract between the Checkpoint screens and the AI routes.
 *
 * Isomorphic on purpose — no SDK import, no node builtins — so the browser and
 * the route handlers can agree on one set of types instead of two.
 *
 * Every coach turn streams prose for the student and then, on its own last
 * line, one machine-readable control object. Prose is what the student reads;
 * control is what the reducer acts on. Splitting them this way keeps a single
 * model call doing both jobs, which matters when the alternative is a second
 * round trip in front of an audience (Doherty Threshold).
 */

export const COACH_SURFACES = ["hint", "requirements", "tradeoff", "diagnose"] as const;
export type CoachSurface = (typeof COACH_SURFACES)[number];

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** One failed expectation, as the runner reported it. */
export type FailingCase = {
  label?: string;
  input: unknown[];
  expected: unknown;
  actual?: unknown;
  error?: string;
};

/** One side of the Tradeoff Phase decision, named after a completed Topic. */
export type TradeoffOption = { id: string; label: string; summary: string };

export type HintRequest = {
  surface: "hint";
  tier: Tier;
  language: Language;
  topic: string;
  problem: string;
  problemUrl: string;
  failing?: FailingCase;
  messages: ChatTurn[];
};

export type RequirementsRequest = {
  surface: "requirements";
  tier: Tier;
  brief: string;
  accepted: string[];
  messages: ChatTurn[];
};

export type TradeoffRequest = {
  surface: "tradeoff";
  tier: Tier;
  brief: string;
  decision: string;
  options: TradeoffOption[];
  choice: string;
  reasoning: string;
  /** True when the one retry is already spent, so this turn cannot hold the student back. */
  retryUsed: boolean;
  previous?: { reasoning: string; verdict: string };
};

export type DiagnoseRequest = {
  surface: "diagnose";
  tier: Tier;
  language: Language;
  brief: string;
  source: string;
  failing: FailingCase;
  messages: ChatTurn[];
};

export type CoachRequest = HintRequest | RequirementsRequest | TradeoffRequest | DiagnoseRequest;

/** Statements the coach accepted this turn, and whether the phase can close. */
export type RequirementsControl = { accepted: string[]; ready: boolean };

/** The coach's judgment of the *reasoning*, never of the choice. */
export type TradeoffControl = { sound: boolean };

/** One line of the response body. Newline-delimited JSON, one object per line. */
export type CoachEvent =
  | { type: "delta"; text: string }
  | { type: "control"; control: unknown }
  | { type: "error"; message: string };

export type GenerateRequest = {
  language: Language;
  entryPoint: string;
  brief: string;
  requirements: string[];
  testSpec: TestCase[];
  /** The student's own prompt. This is the skill being practised, so it is required. */
  instruction: string;
  /**
   * Present on a re-prompt: the implementation being revised. The failing cases
   * are deliberately not sent — saying what broke is the student's job.
   */
  previous?: { source: string };
};

export type GenerateResponse =
  | { ok: true; source: string }
  | { ok: false; reason: "bad_request" | "unconfigured" | "model" | "truncated"; detail: string };

/**
 * Opens the control line. Deliberately unlikely to appear in prose, and
 * scanned for rather than split on, so a coach that mentions it mid-sentence
 * cannot corrupt the student's transcript.
 */
export const CONTROL_MARKER = "@@lilo";

/**
 * Splits a model stream into prose and one trailing control object.
 *
 * Text arrives in chunks that can cut the marker in half, so the tail of the
 * buffer is held back until it is long enough to rule that out. Prose is
 * emitted as soon as it is safe to, because the student is reading it as it
 * lands.
 */
export function createControlSplitter() {
  const hold = CONTROL_MARKER.length - 1;
  let buffer = "";
  let control = "";
  let inControl = false;

  return {
    /** Feeds a chunk in and returns the prose that is now safe to show. */
    push(chunk: string): string {
      if (inControl) {
        control += chunk;
        return "";
      }
      buffer += chunk;

      const at = buffer.indexOf(CONTROL_MARKER);
      if (at !== -1) {
        const prose = buffer.slice(0, at);
        control = buffer.slice(at + CONTROL_MARKER.length);
        buffer = "";
        inControl = true;
        return prose;
      }

      if (buffer.length <= hold) return "";
      const prose = buffer.slice(0, buffer.length - hold);
      buffer = buffer.slice(buffer.length - hold);
      return prose;
    },

    /** Any prose still held back, plus the raw control text. */
    finish(): { prose: string; control: string } {
      const prose = inControl ? "" : buffer;
      buffer = "";
      return { prose, control: control.trim() };
    },
  };
}

/**
 * Reads the control object, tolerantly.
 *
 * A coach that wraps it in a code fence, or adds a word after it, still
 * parses. Returning null is not a failure the student should ever see — the
 * caller falls back to the safe reading, which is always the one that does not
 * block progress.
 */
export function parseControl(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function encodeEvent(event: CoachEvent): string {
  return `${JSON.stringify(event)}\n`;
}
