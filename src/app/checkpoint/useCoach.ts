"use client";

import { useRef, useState } from "react";

import type { ChatTurn, CoachEvent } from "@/lib/prompts/protocol";

/**
 * One coach conversation, streaming.
 *
 * `streaming` is the reply as it lands, rendered token by token — the model is
 * far slower than 400ms and a spinner would say nothing for seconds (Doherty
 * Threshold). `control` comes back from `ask` rather than through state, because
 * the caller is the only thing that knows which action it turns into.
 */

export type CoachAnswer = { text: string; control: Record<string, unknown> };

/** Long enough for a slow answer, short enough to fail before the demo does. */
const TIMEOUT_MS = 60_000;

export function useCoach() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streaming, setStreaming] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  /**
   * Sends one turn. `studentTurn` is what the student just wrote, if this
   * surface keeps a transcript; omit it for one-shot surfaces.
   */
  async function ask(
    payload: Record<string, unknown>,
    studentTurn?: string
  ): Promise<CoachAnswer | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(true);
    setError(null);
    setStreaming("");

    const history = studentTurn ? [...turns, { role: "user" as const, content: studentTurn }] : turns;
    if (studentTurn) setTurns(history);

    let text = "";
    let control: Record<string, unknown> = {};
    let failure: string | null = null;

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), TIMEOUT_MS);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({ ...payload, messages: history }),
      });
      if (!response.body) throw new Error("no response body");

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      const handle = (line: string) => {
        if (!line.trim()) return;
        let event: CoachEvent;
        try {
          event = JSON.parse(line) as CoachEvent;
        } catch {
          return; // A truncated line is not worth failing the turn over.
        }
        if (event.type === "delta") {
          text += event.text;
          setStreaming(text);
        } else if (event.type === "control") {
          control = (event.control ?? {}) as Record<string, unknown>;
        } else if (event.type === "error") {
          failure = event.message;
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) handle(line);
        }
        if (done) break;
      }
      handle(buffer);

      const reply = text.trim();

      if (failure) {
        // Keep whatever prose did arrive; the student was already reading it.
        if (reply) setTurns([...history, { role: "assistant", content: reply }]);
        setError(failure);
        return null;
      }

      if (!reply) {
        setError("The coach answered with nothing. Try that again.");
        return null;
      }

      setTurns([...history, { role: "assistant", content: reply }]);
      return { text: reply, control };
    } catch {
      setError("The coach could not be reached. Check your connection and try again.");
      return null;
    } finally {
      clearTimeout(timeout);
      setStreaming("");
      setPending(false);
      inFlight.current = false;
    }
  }

  return { turns, streaming, pending, error, ask, dismissError: () => setError(null) };
}
