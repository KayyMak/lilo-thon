# Contributing

Built against a 24-hour clock. That shapes everything here: scope discipline matters more than completeness, and the fastest way to lose hours is to build something that was already decided against.

## Read these first

| Document | Why |
|---|---|
| `CONTEXT.md` | The glossary. It wins every naming argument |
| `docs/BUILD-SPEC.md` | State shape, routes, prompts, the demo spine, build order |
| `docs/adr/` | Four decisions and the reasoning behind them |

If a decision in `docs/adr/` looks wrong, read the ADR before arguing with it — several of them deliberately reject the obvious option, and the reasoning is written down.

## Setup

```bash
npm install
npm run dev      # dev server on :3000
npm run build    # production build
npm run lint     # eslint
```

Create `.env.local` with `ANTHROPIC_API_KEY=...`. The key is used only from server routes and must never reach the client. Code execution uses the public Piston API, which needs no key.

## Commits

Conventional Commit subjects, imperative mood. Full guidance in `.claude/skills/commit-conventions/SKILL.md`.

```
type(scope): describe the change
```

- Imperative: `add`, `fix`, `remove` — never `added`, `fixes`, `removing`
- Under 50 characters where you can, 72 at the outside. The `type(scope): ` prefix counts
- No trailing period, no capital after the colon
- One atomic change per commit — if the subject needs "and", split it

**Types:** `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `perf`, `chore`, `build`, `style`, `revert`

**Scopes in this codebase:** `onboarding`, `path`, `topic`, `checkpoint`, `runner`, `prompts`. Omit the scope when a change genuinely spans the repo; don't invent one to fill the slot.

```
feat(checkpoint): add tradeoff phase
fix(runner): strip markdown fences from pasted code
feat(path): animate the checkpoint unlock
docs: record the language choice decision
```

**Sign-off is not required on this repo.** Do not add `Signed-off-by`, `Co-Authored-By`, or any other attribution trailer.

## Pull requests

The title follows the same Conventional Commit format as a commit subject. On a squash merge it becomes the permanent commit subject, so a vague title is a vague changelog entry forever.

One PR solves one stated problem. No `[WIP]` prefixes — use draft status.

Include a **Validation** section with the exact commands you ran and what they returned, not "tested locally":

```
## Validation

npm run build    → compiled, no new warnings
npm run lint     → clean
Demo spine steps 1-5 walked manually in Chrome
```

## Code style

Use what the repo already configures — ESLint via `npm run lint`, and the patterns in the surrounding files. Don't introduce a new tool, formatter, or convention inside a feature or bug-fix PR unless that PR specifically targets project tooling.

## Scope

Two rules carry more weight than anything else here, and both come from ADRs:

**Correctness is decided by running code, never by asking a model whether an answer looks right.** The model's job is to explain a failure the runner already found.

**The student never hand-writes implementation code.** If a surface invites them to, it contradicts the product's central rule and the surface is wrong.

### Deliberately not building

Don't add these, and don't file issues for them:

- Accounts, login, a database
- Any DSA explanation authored by us — NeetCode does that (ADR-0002)
- Peer collaboration and PR review — hard-blocked by client-side state (ADR-0004)
- More than one completable Topic
- Any way for a student to hand-edit generated code

## Before you ask for review

- [ ] Commit subjects are valid Conventional Commits, imperative, under 72 characters
- [ ] Commits are atomic and the branch is rebased on `main`
- [ ] The PR title is itself a valid Conventional Commit subject
- [ ] `npm run build` and `npm run lint` pass with no new warnings
- [ ] No commented-out implementation, no unrelated cleanup
- [ ] Docs updated if behavior or workflow changed — including `CONTEXT.md` if you introduced a term
