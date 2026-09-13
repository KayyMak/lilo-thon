"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import type { ChatTurn } from "@/lib/prompts/protocol";

/**
 * The pieces every phase is built from.
 *
 * Each phase sits in its own bounded region, so the screen reads as steps rather
 * than one long form (Common Region). Nothing here is clever; it exists so the
 * three phases look like one product.
 */

export function Region({
  title,
  hint,
  accent,
  children,
}: {
  title: string;
  hint?: string;
  /** The one highlighted region on the page, never two (Von Restorff). */
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`space-y-4 rounded-3xl border p-6 md:p-8 ${
        accent
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "bad" | "good";
  children: ReactNode;
}) {
  const border =
    tone === "bad" ? "border-red-400" : tone === "good" ? "border-emerald-500" : "border-zinc-300";
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border ${border} p-4 text-sm`}>
      {children}
    </p>
  );
}

export function Button({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-foreground px-6 py-3 font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** The conversation, with the reply rendered as it arrives. */
export function Transcript({
  turns,
  streaming,
  pending,
}: {
  turns: ChatTurn[];
  streaming: string;
  pending: boolean;
}) {
  if (!turns.length && !streaming && !pending) return null;

  return (
    <ol aria-live="polite" aria-busy={pending} className="space-y-4">
      {turns.map((turn, index) => (
        <li key={index} className="space-y-1">
          <Speaker turn={turn.role} />
          <p className="whitespace-pre-wrap">{turn.content}</p>
        </li>
      ))}
      {(streaming || pending) && (
        <li className="space-y-1">
          <Speaker turn="assistant" />
          {streaming ? (
            <p className="whitespace-pre-wrap">{streaming}</p>
          ) : (
            // Acknowledged immediately, even though the answer is seconds away.
            <p className="text-zinc-500 motion-safe:animate-pulse">Reading what you wrote…</p>
          )}
        </li>
      )}
    </ol>
  );
}

function Speaker({ turn }: { turn: ChatTurn["role"] }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {turn === "user" ? "You" : "Coach"}
    </p>
  );
}

/** A labelled textarea that clears itself once the turn is away. */
export function Composer({
  label,
  placeholder,
  submitLabel,
  pendingLabel,
  pending,
  onSubmit,
  rows = 4,
}: {
  label: string;
  placeholder?: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  onSubmit: (value: string) => void;
  rows?: number;
}) {
  const [value, setValue] = useState("");
  const id = label.replace(/\W+/g, "-").toLowerCase();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    setValue("");
    onSubmit(text);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-400 bg-transparent p-4"
      />
      <Button disabled={pending || !value.trim()}>{pending ? pendingLabel : submitLabel}</Button>
    </form>
  );
}
