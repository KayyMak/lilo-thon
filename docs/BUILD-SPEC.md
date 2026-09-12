# Build Spec

Implementation spec for the 24-hour demo. Read `CONTEXT.md` for vocabulary and `docs/adr/` for why things are the way they are. Where this document and those disagree, they win and this one is wrong.

## The one rule

The student never hand-writes implementation code, and the model never decides whether code is correct. The student writes specifications; the AI writes implementations; the execution service decides pass or fail; the AI explains failures it did not adjudicate.

## Non-goals

Do not build these. Each was considered and cut.

- Authentication, user accounts, a database
- Any explanation of a DSA concept authored by us (NeetCode does this)
- Peer collaboration, PR review — hard-blocked by client-side state, see ADR-0004
- More than one completable Topic
- Letting the student edit generated implementation code by hand

## Acceptance test: the demo spine

The build is done when a stranger can do this unaided, with no developer-only buttons anywhere in the flow.

1. Answers four onboarding questions and is placed in a Tier
2. Sees a path: **Arrays** unlocked, **Hashing** locked, **Project Checkpoint** locked
3. Opens Arrays and is routed out to NeetCode's Two Sum
4. Returns, pastes a Python solution, it actually runs, it passes, Arrays completes
5. Project Checkpoint unlocks. This is the product thesis; it must feel like an event
6. Requirements Phase — types something vague, gets pushed back on
7. Tradeoff Phase — array or hashmap, and why; reasoning is evaluated
8. Test Specification — enters three input/expected pairs, prompts, implementation appears
9. Tests run, some fail, student re-prompts with the failure, all pass

## Stack

Next.js App Router, TypeScript, Tailwind, deployed on Vercel. Server routes only, no separate API. No database.

Use Claude Sonnet 5 (`claude-sonnet-5`) for all runtime AI surfaces — latency matters more than depth on stage, and every one of these is a short, tightly-scoped turn.

## State

One serializable object in `localStorage` under a single key, so it becomes one database row later without reshaping (ADR-0001).

```ts
type Tier = 'beginner' | 'intermediate' | 'advanced'
type TopicStatus = 'locked' | 'unlocked' | 'complete'
type Phase = 'locked' | 'requirements' | 'tradeoff' | 'testing' | 'complete'

type ProgressState = {
  version: 1
  tier: Tier | null
  language: string                 // the student's choice, set once, changeable
  topics: Record<string, { status: TopicStatus; solvedProblemIds: string[] }>
  checkpoint: {
    phase: Phase
    projectId: string
    requirements: string[]         // statements the coach accepted
    tradeoff?: { choice: string; reasoning: string; verdict: string }
    testSpec: Array<{ input: unknown[]; expected: unknown; label?: string }>
    generated?: { language: string; source: string }
    lastRun?: RunResult
  }
}
```

Write every state change through one reducer. Persist on change. Rehydrate on load and land the student back on the phase they left.

## Content (hardcoded — this is deliberate)

- **Topics**: `arrays` (starts unlocked), `hashing` (locked, visible, not completable). Hashing exists to prove the sequence repeats.
- **Practice Problems**: NeetCode's Two Sum. Entry point `twoSum`, test cases written by hand.
- **Unlock gate**: `REQUIRED_PROBLEMS_PER_TOPIC = 1`. A named constant, not a magic number — the glossary says a Topic takes several problems, and one is a demo setting, not the concept.
- **Project**: word-frequency counter returning the top N words. Chosen because it genuinely needs a hashmap for counts and an array for ordering, so the Tradeoff Phase is real rather than staged, and its behaviour expresses cleanly as input/expected data.

## Tier

Tier affects exactly two things: which NeetCode difficulty the student is routed to, and how much scaffolding the coach offers before making the student struggle. One field on a problem, one line in a system prompt. Nothing else.

Placement is plain logic, no model call.

## Execution

Piston (`https://emkc.org/api/v2/piston/execute`), with Judge0 as the fallback if rate limits bite.

A **runner template** per language wraps the student's or the AI's source: read test cases as JSON on stdin, call the entry point, print results as JSON. Templates live in one directory, one file each, so adding a language is a single file.

Ship **Python and JavaScript**. Be honest in the UI about which languages are live rather than offering a long list that half-works — Java and C++ are the first two to add if there is time. This is the one place the build falls short of "any language", and it is a template-writing cost, not a design compromise.

## Server routes

- `POST /api/run` — takes `{ language, source, entryPoint, testCases }`, wraps the source in the runner template, calls Piston, returns per-case `{ passed, actual, expected, stderr }`. The only thing in the system permitted to judge correctness.
- `POST /api/chat` — streams. Takes a `surface` discriminator and the relevant slice of state.
- `POST /api/generate` — takes `{ requirements, testSpec, language, entryPoint }`, returns implementation source only.

## AI surfaces

Four chat surfaces, one generation surface. Each gets its own system prompt, each is short.

- **hint** — moves a stuck student forward with a question. Never states the answer, never writes code. See Socratic Hint in `CONTEXT.md`.
- **requirements** — challenges vague statements, asks about edge cases (ties, empty input, casing, punctuation). Never proposes an implementation or a data structure. Accepts once there are at least three concrete behaviours and one edge case.
- **tradeoff** — poses exactly one decision with two named options drawn from completed Topics. Evaluates the student's *reasoning*, not their choice; both options are defensible and the prompt must say so.
- **diagnose** — given a failing case and the generated source, explains what the failure means. Must not rewrite the code. The student re-prompts; that is the skill being practised.
- **generate** — implementation only, in the chosen language, matching the entry point name. No commentary, no explanation.

## UX laws that bind here

Applying the subset that changes a decision on these screens. The remaining laws from the sheet reduce to using one component set consistently, which is assumed.

- **Doherty Threshold** — the hazard. Piston and the model are both far slower than 400ms. Never show a bare spinner. Stream tokens as they arrive; render one skeleton row per test case immediately and flip each to pass or fail as results land. Acknowledge every click inside 100ms even when the work takes eight seconds.
- **Zeigarnik Effect** — the path view must always show something visibly unfinished. Locked Topics stay on screen; a progress indicator sits at partial fill.
- **Goal-Gradient Effect** — state the distance explicitly: "1 Topic until your first Project". The goal has to look close, because it is.
- **Von Restorff Effect** — when the Checkpoint unlocks it takes the only accent colour on the page. One highlighted thing, never two.
- **Peak-End Rule** — two moments carry the demo: the unlock, and the tests going green. Animate both. The last thing a judge sees must be all-green.
- **Hick's Law** — onboarding is four questions, at most four options each. No free text.
- **Miller's Law** — the Checkpoint shows three named phases, never more.
- **Jakob's Law** — path on the left, conversation on the right. The layout of every AI tool a judge has used this year.
- **Proximity, Common Region, Uniform Connectedness** — draw the connecting line between Topic nodes; the line is what makes the sequence read as a path rather than a list. Bound each phase in its own region.
- **Postel's Law** — be liberal on input. Strip markdown fences from pasted code, tolerate either `twoSum` or `two_sum`, accept loose JSON in the test spec, normalise whitespace. Every rejection here is a demo that stalls.
- **Tesler's Law** — do not simplify the Tradeoff Phase into a multiple choice with a right answer. The irreducible complexity is the reasoning, and it is the thing being taught.
- **Aesthetic-Usability Effect** — judges score polish as correctness. The last hour goes to visual finish, not to another feature.

## Build order

Riskiest thing first. Piston is the single external dependency that can sink the build, so it gets proven before anything is built on top of it.

| Hours | Work |
|---|---|
| 0–2 | Scaffold, state model and reducer, static path view |
| 2–4 | **Piston spike** — one hardcoded solution, running, returning pass/fail. Do not proceed until green |
| 4–6 | Onboarding, Tier placement, language choice |
| 6–9 | Topic view, NeetCode route-out, paste-back, verification, Topic completion |
| 9–10 | The unlock. Animate it |
| 10–14 | Requirements and Tradeoff phases |
| 14–18 | Test Specification UI, generate, run, diagnose, re-prompt loop |
| 18–21 | Polish, both Peak-End moments, empty and error states |
| 21–23 | Rehearse the spine end to end at least three times. Fix what breaks |
| 23–24 | Buffer. Do not start anything new |

## Risks

- **Piston rate-limits or is down on demo day.** Cache successful runs by source hash. Keep a recorded video of the working spine as a fallback.
- **Model latency stalls the demo.** Sonnet 5, short prompts, stream everything, cap response length.
- **The judge opens a new tab and loses all progress.** Known and accepted. Do not demo in a fresh tab.
- **Generated code that never passes the tests.** Pin the entry point name in the generate prompt and echo the test spec into it verbatim. Rehearse with the exact demo inputs.
