---
name: commit-conventions
description: Write Conventional Commit messages, pull request titles, and DCO sign-offs to the standard used by NVIDIA projects such as Dynamo and Megatron-LM. Use when writing a commit message or PR title, splitting work into commits, or preparing a branch for review.
---

# Commit Conventions

Commit messages and PR titles are read far more often than they are written — by changelog tooling, by `git log` archaeology, and by reviewers deciding whether a change is worth their attention. Treat them as part of the deliverable.

Check the repository first. If it carries its own `CONTRIBUTING.md`, commit template, or commitlint config, that wins over everything below.

## Subject line

```
type(scope): describe the change
```

- **Imperative mood.** Write the subject as an instruction to the codebase, as if completing the sentence "if applied, this commit will…". `add`, `fix`, `remove` — never `added`, `fixes`, `removing`.
- **50 characters ideally, 72 as a hard limit.** The `type(scope): ` prefix counts toward it, so a long scope buys you a shorter description.
- **No trailing period.** No capital letter after the colon unless it is a proper noun.
- **Say what changed, not which files changed.** `fix(router): handle empty worker pool` beats `fix(router): update router.rs`.

### Types

| Type | Use |
|---|---|
| `feat` | New behavior or capability |
| `fix` | Bug fix |
| `docs` | Documentation-only change |
| `test` | Test addition or correction |
| `ci` | Continuous integration change |
| `refactor` | Internal change with no intended behavior change |
| `perf` | Performance improvement |
| `chore` | Maintenance work |
| `build` | Build system or dependency change |
| `style` | Formatting-only change |
| `revert` | Revert of an earlier change |

If a change plausibly fits two types, pick the one a reader would search for. A bug fix that needed a refactor to land is a `fix`.

### Scope

Optional, and worth adding when it clarifies ownership or blast radius. Use the component's own name as the codebase spells it — `router`, `frontend`, `planner`, `operator` — not a directory path.

Omit the scope when a change genuinely spans the repository. Do not invent a scope to fill the slot.

### Examples

```
feat(router): add weighted load balancing
fix(frontend): handle streaming timeout
docs: clarify the macOS build steps
test(planner): cover scaling policy boundaries
perf(kv-cache): avoid recomputing block hashes on hit
```

Rewrites of common mistakes:

| Instead of | Write |
|---|---|
| `Fixed bug in the parser` | `fix(parser): reject unterminated string literals` |
| `Updates to documentation` | `docs(install): add CUDA 12 prerequisites` |
| `feat: Added new endpoint for metrics.` | `feat(metrics): add readiness endpoint` |
| `refactor: cleanup` | `refactor(worker): extract backoff into a helper` |
| `misc changes` | Split it. This is not one commit |

## Body

Optional for a self-evident change, expected for anything else.

- Blank line after the subject, wrap at 72 characters.
- Explain **why**, and what the reader would otherwise find surprising. The diff already shows how.
- Reference issues in the body, not the subject: `Fixes #1234`.
- A commit that is hard to describe without "and" is usually two commits.

## Sign-off (DCO)

Every commit needs a Developer Certificate of Origin trailer. Produce it with the flag rather than typing it:

```bash
git commit -s
git commit -s -m "fix(router): handle empty worker pool"
```

This appends:

```
Signed-off-by: Jane Doe <jane@example.com>
```

The name and email **must match the commit author identity**. Verify with `git config user.name` and `git config user.email` before the first commit on a branch; a mismatch fails the DCO check in CI and is tedious to repair afterward.

`-s` works alongside `-F` and `-F -`, so a heredoc-authored message still gets the trailer.

Repairing missing sign-offs:

```bash
git commit --amend -s --no-edit        # last commit only
git rebase --signoff main              # every commit on the branch
```

Trailers sit in one block at the end with no blank lines between them. Add no other trailers unless the project asks for them.

## Atomic commits

Each commit is one self-contained feature or fix that builds and passes tests on its own.

- Separate refactors from behavior changes. A reviewer should never have to find two real changes inside a thousand-line reformat.
- Keep unrelated cleanup out. Drive-by fixes belong in their own commit, or their own PR.
- Rebase onto the main branch rather than merging it in, so history stays linear and each commit remains reviewable in isolation.

Useful while splitting work:

```bash
git add -p                    # stage selectively
git rebase -i <base>          # reorder, squash, reword before review
```

## Pull request titles

**The PR title follows the same Conventional Commit format as a commit subject**, and the same length limits. On a squash merge it becomes the permanent commit subject, so a vague title becomes a vague line in the changelog forever.

- One PR solves one clearly stated problem. If the title needs "and", split the PR.
- The title describes the outcome, not the activity: `feat(planner): add scaling policy hooks`, not `Planner work` or `PR for the planner`.
- Do not number or prefix titles with branch names, ticket IDs, or `[WIP]`. Use draft status for work in progress.

### PR body

Include a **Validation** section listing the exact commands run and their results — not "tested locally". Reviewers assess correctness, test coverage, architecture fit, readability, and how feedback is addressed; give them the evidence directly.

```
## Validation

pytest tests/router -q          → 38 passed
cargo test --locked -p router   → 12 passed
```

## Before requesting review

- [ ] Every commit subject is a valid Conventional Commit under 72 characters, in the imperative
- [ ] Every commit is signed off, with the identity matching the author
- [ ] Commits are atomic and the branch is rebased on main
- [ ] The PR title is itself a valid Conventional Commit subject
- [ ] Local checks pass — `pre-commit run --all-files` where the repo configures it
- [ ] Tests cover new behavior and bug fixes where practical
- [ ] No commented-out implementation and no unrelated cleanup
- [ ] Docs updated when behavior or workflow changed

CI is final verification, not a substitute for running the relevant checks locally first.
