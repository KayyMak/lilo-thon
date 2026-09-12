"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Language } from "@/lib/execution";
import { useProgress, type Tier } from "@/lib/state";

import { placeTier, QUESTIONS } from "./placement";

type LanguageOption = { id: Language; label: string };

const TIER_LABELS: Record<Tier, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * One question per screen, then language, then the placement. Picking an
 * option advances immediately, so every click is acknowledged at once.
 */
export function Onboarding({ languages }: { languages: LanguageOption[] }) {
  const router = useRouter();
  const { dispatch } = useProgress();
  const [answers, setAnswers] = useState<number[]>([]);
  const [placed, setPlaced] = useState<Tier | null>(null);

  const answerQuestion = (option: number) => setAnswers([...answers, option]);
  const goBack = () => setAnswers(answers.slice(0, -1));

  const chooseLanguage = (language: Language) => {
    const tier = placeTier(answers);
    dispatch({ type: "placeInTier", tier });
    dispatch({ type: "chooseLanguage", language });
    setPlaced(tier);
  };

  if (placed) {
    return (
      <Screen>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          You&apos;re placed in
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{TIER_LABELS[placed]}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Every student starts at Arrays. Your Tier sets how hard your Practice Problems are.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 self-start rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-85"
        >
          See your path
        </button>
      </Screen>
    );
  }

  const step = answers.length;
  const onLanguageStep = step === QUESTIONS.length;
  const prompt = onLanguageStep ? "Which language do you want to solve problems in?" : QUESTIONS[step].prompt;
  const options = onLanguageStep
    ? languages.map((language) => ({ key: language.id, label: language.label, pick: () => chooseLanguage(language.id) }))
    : QUESTIONS[step].options.map((label, index) => ({ key: label, label, pick: () => answerQuestion(index) }));

  return (
    <Screen>
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>{onLanguageStep ? "Last step" : `Question ${step + 1} of ${QUESTIONS.length}`}</span>
        {step > 0 && (
          <button type="button" onClick={goBack} className="hover:text-foreground">
            Back
          </button>
        )}
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-foreground transition-[width] duration-300"
          style={{ width: `${(step / (QUESTIONS.length + 1)) * 100}%` }}
        />
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{prompt}</h1>

      <ul className="flex flex-col gap-3">
        {options.map((option) => (
          <li key={option.key}>
            <button
              type="button"
              onClick={option.pick}
              className="w-full rounded-xl border border-zinc-200 px-5 py-4 text-left transition-colors hover:border-foreground active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      {children}
    </main>
  );
}
