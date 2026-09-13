# Project Checkpoint

`/checkpoint`. Unlocks when Arrays and Hashing are both complete, and runs the
three phases in order: Requirements, Tradeoff, Tests. The phase comes from
`state.checkpoint.phase`, so a refresh lands the student back where they were.

The student never writes implementation code here. They state requirements,
reason through one tradeoff, author a Test Specification as data, and prompt
until the tests pass. Generated code is rendered in a `<pre>`, never a textarea:
a surface that invited hand-editing would contradict Prompt, Don't Code.

## What talks to what

| File | Job |
|---|---|
| `Checkpoint.tsx` | Gates (hydration, Tier, locked), the rail, and the phase switch |
| `RequirementsPhase.tsx` | Conversation until three behaviours and an edge case are accepted |
| `TradeoffPhase.tsx` | One decision, two options from completed Topics, reasoning judged |
| `TestingPhase.tsx` | Test Specification editor, generate, run, diagnose, re-prompt |
| `project.ts` | The project, the decision, and the two options. All hardcoded |
| `testSpec.ts` | Reads the editor rows into `TestCase[]`, liberally |
| `useCoach.ts` | One streaming conversation against `/api/chat` |
| `ui.tsx` | Region, Transcript, Composer, Notice, Button |

Prompts and the model choice live in `src/lib/prompts`. Correctness comes from
`/api/run` and nowhere else — the coach explains failures it did not adjudicate.

## The coach protocol

`/api/chat` streams newline-delimited JSON, one object per line:

```
{"type":"delta","text":"…"}      prose, as it arrives
{"type":"control","control":{…}} the decision the reducer acts on
{"type":"error","message":"…"}   including 4xx and 503, same format
```

The model writes prose and then one `@@lilo {…}` line. The route splits them, so
the control line never reaches the student and the prose never reaches the
reducer. A missing or unparseable control object is read as "no decision", which
is always the reading that lets the student keep going.

`/api/generate` is not streamed — the source is only useful whole, because the
next thing that happens to it is a run. It takes the student's own `instruction`,
and on a re-prompt the previous `source`. It is **not** given the failing cases:
saying what broke is the student's job, and handing the model the failures would
do that job for them.

## Not built yet

- **The Stuck? button.** The `hint` surface, its prompt and its Tier scaffolding
  are done and callable; wiring the button lives in `src/app/topic/` (Tola).
- **ADR-0006 Tier modes.** Every Tier currently gets Prompt, Don't Code — the
  Advanced path, which is what the demo spine walks. Beginner (student writes the
  implementation) and Intermediate (explain the code before it runs) need
  `mode`, `explanation`, its verdict and a retry flag in `CheckpointProgress`,
  which is `src/lib/state/` (Niyi). The ADR is still `proposed`.
- **Moving up a Tier** after a Checkpoint, for the same reason: it is a reducer
  action.

## Validation

`npm run lint` and `npm run build` both pass clean.

Needs `ANTHROPIC_API_KEY` in `.env.local` for anything that talks to the coach.
Without it every AI surface returns a 503 that says so, which is worth seeing
once — the screens stay usable and no phase gets stuck.

Walk it from `/onboarding`: choose a Tier and a language, clear Arrays and
Hashing, then open the Checkpoint from the path.

1. **Requirements.** Type something vague ("it should handle punctuation") and
   check the coach pushes back instead of accepting it. Then name a concrete
   behaviour and watch it appear in *Accepted so far* and in the rail. Three
   behaviours and an edge case should enable *Move on to the tradeoff*.
2. **Tradeoff.** Send a weak reason ("hash maps are faster") and confirm you stay
   on the phase with one attempt left, and that the verdict says what is missing.
   Send a real one and confirm it advances. Sending a second weak one must also
   advance — the model never blocks progress.
3. **Tests.** Write three cases. The input box takes `"the cat sat", 1` or
   `["the cat sat", 1]` or `'the cat sat', 1`, and expected takes `["the"]`.
   Save, then prompt for the implementation.
4. **Run.** Three skeleton rows should appear at once, then flip to real
   verdicts. A failing case offers *Ask what this failure means*; the coach must
   explain it without rewriting the code.
5. **Re-prompt** with what you learned, run again, and all-green completes the
   Checkpoint.

Refresh at each phase and confirm you land back on it. The runner has been
checked directly against this project: a word-frequency implementation in both
Python and JavaScript passes four cases (winner, tie, empty text, casing and
punctuation) through `/api/run` in 1.2–2.5s.
