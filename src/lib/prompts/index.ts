/**
 * The AI layer: prompts, the model choice, and request validation.
 *
 * This barrel is the SERVER surface — importing it pulls in the Anthropic SDK
 * and the execution registry. Client components import the wire contract
 * directly from `@/lib/prompts/protocol`, which has no runtime dependencies.
 */
export { buildCoachTurn } from "./coach";
export { buildGenerateTurn, extractSource } from "./generate";
export {
  MAX_COACH_TOKENS,
  MAX_GENERATE_TOKENS,
  MODEL,
  THINKING,
  claude,
  coachErrorMessage,
  isConfigured,
} from "./model";
export { parseCoachRequest, parseGenerateRequest, type Parsed } from "./validate";
