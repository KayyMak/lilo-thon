import { wrapJavaScript, wrapPython } from "./harness";

/**
 * The language registry. Adding a language is adding one entry here plus its
 * harness template — nothing else in the app needs to change.
 *
 * Judge0 ids come from GET https://ce.judge0.com/languages. Re-check them if
 * runs start failing with a compile error for a language that used to work;
 * the public instance does update its images.
 */
export type LanguageSpec = {
  /** Shown to the student. */
  label: string;
  /** Judge0 language id. */
  judge0Id: number;
  /** Wraps student source with the test harness for this language. */
  wrap: (source: string) => string;
  /**
   * Entry point names to try, in order, given a canonical camelCase name.
   * Lets a Python student write two_sum without being corrected for it.
   */
  entryPointAliases: (canonical: string) => string[];
};

const camelToSnake = (name: string) =>
  name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export const LANGUAGES = {
  python: {
    label: "Python",
    judge0Id: 71,
    wrap: wrapPython,
    entryPointAliases: (c) => [c, camelToSnake(c)],
  },
  javascript: {
    label: "JavaScript",
    judge0Id: 102,
    wrap: wrapJavaScript,
    entryPointAliases: (c) => [c, camelToSnake(c)],
  },
} satisfies Record<string, LanguageSpec>;

export type Language = keyof typeof LANGUAGES;

export const LANGUAGE_IDS = Object.keys(LANGUAGES) as Language[];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in LANGUAGES;
}

export function specFor(language: Language): LanguageSpec {
  return LANGUAGES[language];
}
