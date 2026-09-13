import Anthropic from "@anthropic-ai/sdk";

/**
 * The one place that decides which model runs and how long it may talk.
 *
 * Sonnet 5 for every runtime surface (BUILD-SPEC, Stack): each one is a short,
 * tightly-scoped turn, and on stage latency matters more than depth.
 */
export const MODEL = "claude-sonnet-5";

/**
 * Thinking off, for the same reason. These turns evaluate a paragraph against
 * criteria that are written out in the system prompt; there is nothing here
 * worth a second of silent reasoning in front of judges.
 */
export const THINKING = { type: "disabled" } as const;

/** A coach that writes an essay has already lost the student. */
export const MAX_COACH_TOKENS = 700;

/**
 * Enough for a small function in any live language, and low enough that a
 * runaway generation fails fast instead of stalling the demo. Callers must
 * treat `stop_reason: "max_tokens"` as a failure rather than run a half file.
 */
export const MAX_GENERATE_TOKENS = 3000;

let client: Anthropic | null = null;

/**
 * The Anthropic client, created once per server process.
 *
 * Server-only by construction: the key is read from the environment here and
 * never crosses to the browser (CONTRIBUTING, Setup).
 */
export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** False when `.env.local` has no key, which is a configuration error, not a model failure. */
export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * What the student is told when a call fails.
 *
 * Every branch says what to do next, because the student cannot act on a status
 * code and a stalled screen is worse than a wrong one.
 */
export function coachErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "The coach is not configured correctly. Check ANTHROPIC_API_KEY in .env.local.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The coach is handling too many requests. Try that again in a moment.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "The coach could not be reached. Check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The coach failed to answer (${error.status ?? "no status"}). Try that again.`;
  }
  return "The coach failed to answer. Try that again.";
}
