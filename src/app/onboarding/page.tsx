import type { Metadata } from "next";

import { LANGUAGE_IDS, LANGUAGES } from "@/lib/execution";

import { Onboarding } from "./Onboarding";

export const metadata: Metadata = {
  title: "Get placed",
};

/**
 * A server component so the language list comes from the execution registry.
 * That module is server-only, so only plain ids and labels cross to the client.
 * Only languages that actually run are offered (BUILD-SPEC, Execution).
 */
export default function OnboardingPage() {
  const languages = LANGUAGE_IDS.map((id) => ({ id, label: LANGUAGES[id].label }));
  return <Onboarding languages={languages} />;
}
