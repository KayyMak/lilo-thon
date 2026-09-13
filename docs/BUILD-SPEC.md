# Build Spec

Implementation spec for the 24-hour demo. Read `CONTEXT.md` for vocabulary and `docs/adr/` for why things are the way they are. Where this document and those disagree, they win and this one is wrong.

## The one rule

The student never hand-writes implementation code, and the model never decides whether code is correct. The student writes specifications; the AI writes implementations; the execution service decides pass or fail; the AI explains failures it did not adjudicate.

## Non-goals

Do not build these. Each was considered and cut.

- Authentication, user accounts, a database
- Any explanation of a DSA concept authored by us (NeetCode does this)
- Peer collaboration, PR review — hard-blocked by client-side state, see ADR-0004
- More than two completable Topics
- Letting the student edit generated implementation code by hand

## Acceptance test: the demo spine

The build is done when a stranger can do this unaided, with no developer-only buttons anywhere in the flow.

1. Answers four onboarding questions and is placed in a Tier
2. Sees a path: **Arrays** unlocked, **Hashing** locked, **Project Checkpoint** locked
3. Opens Arrays and is routed out to the NeetCode problem for their Tier
4. Returns, pastes a Python solution, it actually runs, it passes, Arrays completes and Hashing unlocks
5. Does the same for Hashing
6. Project Checkpoint unlocks. This is the product thesis; it must feel like an event
7. Requirements Phase — types something vague, gets pushed back on
8. Tradeoff Phase — array or hashmap, and why; reasoning is evaluated
9. Test Specification — enters three input/expected pairs, prompts, implementation appears
10. Tests run, some fail, student re-prompts with the failure, all pass

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
    tradeoff?: { choice: string; reasoning: string; verdict: string; retryUsed: boolean }
    testSpec: Array<{ input: unknown[]; expected: unknown; label?: string }>
    generated?: { language: string; source: string }
    lastRun?: RunResult
  }
}
```

Write every state change through one reducer. Persist on change. Rehydrate on load and land the student back on the phase they left.

## Content (hardcoded — this is deliberate)

- **Topics**: `arrays` (starts unlocked), then `hashing` (unlocks when Arrays completes). Both are completable, and the Checkpoint unlocks only when both are complete — the Tradeoff Phase asks array or hashmap, and its options must come from Topics the student has actually completed.
- **Practice Problems**: one per Topic per Tier, test cases written by hand.

  | Topic | Beginner | Intermediate | Advanced |
  |---|---|---|---|
  | Arrays | Concatenation of Array | Majority Element | Product of Array Except Self |
  | Hashing | Contains Duplicate | Valid Anagram | Longest Consecutive Sequence |

  Picked so each has exactly one correct return value. The harness compares the returned value exactly, so problems whose answer may come back in any order (Two Sum, Group Anagrams, Top K Frequent Elements) would fail correct solutions. Top K Frequent Elements is also ruled out because it is the Checkpoint project in miniature. Take each entry point from the function name on the NeetCode page, not from LeetCode, because students paste NeetCode's starter code and the names can differ.
- **Unlock gate**: `REQUIRED_PROBLEMS_PER_TOPIC = 1`. A named constant, not a magic number — the glossary says a Topic takes several problems, and one is a demo setting, not the concept.
- **Project**: word-frequency counter returning the top N words. Chosen because it genuinely needs a hashmap for counts and an array for ordering, so the Tradeoff Phase is real rather than staged, and its behaviour expresses cleanly as input/expected data.

## Tier

Tier affects exactly two things: which NeetCode difficulty the student is routed to, and how much scaffolding the coach offers before making the student struggle. One field on a problem, one line in a system prompt. Nothing else — in particular, Tier never skips Topics. Every student starts at Arrays.

Placement is plain logic, no model call. Four questions, each answer worth 0–3 in the order listed:

1. **How much programming have you done?** None yet · One intro course · A few courses or personal projects · An internship or job
2. **Which could you use to solve a problem without looking anything up?** Loops and lists · Dictionaries or hash maps · Recursion or trees · Graphs or dynamic programming
3. **How do Easy LeetCode problems usually go for you?** Haven't tried one · Usually stuck · Usually solve them, sometimes with hints · Solve most, working on Mediums
4. **Given a list of numbers, you need two that add up to a target. What's your first idea?** Not sure yet · Try every pair · Sort the list, then walk inward from both ends · Remember the numbers already seen, and check for each new one's partner

Total 0–4 is Beginner, 5–8 Intermediate, 9–12 Advanced. Answering "Not sure yet" on question 4 caps placement at Intermediate: the first three questions are the student's own report, and question 4 is the only one that checks it, so self-report alone cannot earn Advanced. Question 4 is Two Sum, which is deliberately not one of the Practice Problems.

Language choice is its own step after the four questions, not a fifth question.

## Execution

**Built and verified.** Judge0 CE (`https://ce.judge0.com`), no API key required. Piston was the original choice and is unusable — see ADR-0005.

Everything lives in `src/lib/execution`, and nothing outside that directory knows which service is in use:

| File | Job |
|---|---|
| `types.ts` | The contract. `runTests(request) → outcome` |
| `languages.ts` | The registry. One entry per language — adding a language is adding an entry |
| `harness.ts` | Per-language wrapper that calls the student's function and reports a verdict |
| `judge0.ts` | The adapter. The only file that knows Judge0 exists |
| `index.ts` | Caching, plus the only function the rest of the app may call |

`POST /api/run` takes `{ language, source, entryPoint, cases }` and returns per-case results. A wrong answer is a `200` with `passed: false` — only a malformed request is a `4xx`, and only transport trouble is a `502`.

Live languages are **Python and JavaScript**. The limit is not Judge0, which offers around 90; it is that each harness must be written in the student's own language and must parse JSON, which Python and JavaScript do natively and Java and C++ do not. Adding those means inlining test inputs as literals instead of passing them on stdin. Show only the languages that actually work rather than a long list that half-works.

Successful runs are cached by a hash of language, source and cases. This guards against the public instance's undocumented rate limits during a build, not against slowness.

## Server routes

- `POST /api/run` — takes `{ language, source, entryPoint, cases }`, wraps the source in the harness, calls Judge0, returns `{ ok, results, ms, engine, cached }` with one `{ passed, actual, error, label }` per case. The only thing in the system permitted to judge correctness. **Built and verified.**
- `POST /api/chat` — streams newline-delimited JSON. Takes a `surface` discriminator and the relevant slice of state, and returns `{ type: "delta" }` prose as it arrives, then one `{ type: "control" }` object carrying the decision the reducer acts on — the coach writes both in one turn and the route splits them. Failures, including a malformed request or a missing key, arrive as `{ type: "error" }` in the same format. **Built.**
- `POST /api/generate` — takes `{ requirements, testSpec, language, entryPoint, instruction }` plus `previous` on a re-prompt, returns implementation source only. Not streamed: the source is only useful whole, because the next thing that happens to it is a run. `instruction` is the student's own prompt, and the failing cases are deliberately not sent — saying what broke is the student's job. **Built.**

## AI surfaces

Four chat surfaces, one generation surface. Each gets its own system prompt, each is short.

- **hint** — moves a stuck student forward with a question. Never states the answer, never writes code. See Socratic Hint in `CONTEXT.md`. Lives on the Topic view: a "Stuck?" button is always visible, and after a failed run the hint receives the failing case. Tier sets how soon it is offered unprompted — Beginner after the first failed run, Intermediate after the second, Advanced never (the button stays). If the student is stuck on the concept rather than the problem, the hint points back to NeetCode instead of explaining it (ADR-0002).
- **requirements** — challenges vague statements, asks about edge cases (ties, empty input, casing, punctuation). Never proposes an implementation or a data structure. Accepts once there are at least three concrete behaviours and one edge case.
- **tradeoff** — poses exactly one decision with two named options drawn from completed Topics. Evaluates the student's *reasoning*, not their choice; both options are defensible and the prompt must say so. Weak reasoning gets one retry, with the coach saying what is missing; after that the student moves on regardless, with the verdict shown. The model must never be the thing that stops a student from progressing.
- **diagnose** — given a failing case and the generated source, explains what the failure means. Must not rewrite the code. The student re-prompts; that is the skill being practised.
- **generate** — implementation only, in the chosen language, matching the entry point name. No commentary, no explanation.

## UX laws that bind here

Applying the subset that changes a decision on these screens. The remaining laws from the sheet reduce to using one component set consistently, which is assumed.

- **Doherty Threshold** — the hazard. A Judge0 run takes about a second and the model is slower still, both far past 400ms. Never show a bare spinner. Stream tokens as they arrive; render one skeleton row per test case immediately and flip each to pass or fail as results land. Acknowledge every click inside 100ms even when the work takes eight seconds.
- **Zeigarnik Effect** — the path view must always show something visibly unfinished. Locked Topics stay on screen; a progress indicator sits at partial fill.
- **Goal-Gradient Effect** — state the distance explicitly: "2 Topics until your first Project". The goal has to look close, because it is.
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

Riskiest thing first — execution was the one external dependency that could sink the build, so it was proven before anything got built on top of it.

The hours below are a rough shape, not a schedule. What matters is the order, since each block depends on the one before it, and the rule at the end about stopping to rehearse.

| Roughly | Work | Owner |
|---|---|---|
| 0–2 | Scaffold, state model and reducer, static path view | Niyi |
| 2–4 | ~~Execution spike~~ **done.** Judge0 wired up and verified against 13 cases | — |
| 4–6 | Onboarding, Tier placement, language choice | Niyi |
| 6–9 | Topic view, NeetCode route-out, paste-back, verification, Topic completion, both Topics' problems per Tier, hint button (Kay writes the hint prompt) | Tola |
| 9–10 | The unlock. Animate it | Niyi |
| 10–14 | Requirements and Tradeoff phases | Kay |
| 14–18 | Test Specification UI, generate, run, diagnose, re-prompt loop | Kay, Niyi floating in |
| 18–21 | Polish, both Peak-End moments, empty and error states | All |
| Last 3h | **Stop building.** Rehearse the spine end to end at least three times, fix what breaks, start nothing new | All |

## Risks

- **Judge0 rate-limits or goes whitelist-only.** Exactly what Piston did, so treat it as likely rather than unlucky. Caching by source hash is in place. The judged artifact is a recorded demo, so an outage during judging cannot break the submission, and the execution interface keeps an in-browser engine available as a contained swap.
- **Model latency stalls the demo.** Sonnet 5, short prompts, stream everything, cap response length.
- **The judge opens a new tab and loses all progress.** Known and accepted. Do not demo in a fresh tab.
- **Generated code that never passes the tests.** Pin the entry point name in the generate prompt and echo the test spec into it verbatim. Rehearse with the exact demo inputs.
