import type { Language } from "@/lib/execution";

/** Expose NeetCode class methods to the runner's standalone-function contract. */
export function prepareSource(raw: string, language: Language, entryPoint: string): string {
  const source = raw.trim().replace(/^```[\w+-]*\r?\n([\s\S]*?)\r?\n?```$/, "$1");
  const names = [entryPoint, entryPoint.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
  if (language === "python") {
    return `from __future__ import annotations\n${source}\n\nif "Solution" in globals():\n    for _topic_name in ${JSON.stringify(names)}:\n        if not callable(globals().get(_topic_name)) and hasattr(Solution, _topic_name):\n            globals()[_topic_name] = getattr(Solution(), _topic_name)\n`;
  }
  return `${source}\n\n${names.map((name) => `if (typeof ${name} !== "function" && typeof Solution !== "undefined" && typeof Solution.prototype.${name} === "function") { globalThis.${name} = (...args) => new Solution().${name}(...args); }`).join("\n")}\n`;
}
