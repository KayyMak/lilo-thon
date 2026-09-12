# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Design is settled; implementation has not started. There is no source code, package manifest, or test suite in the repo yet — only design documents. Add the build, lint, run, and test commands to this file once the project is scaffolded.

`CONTEXT.md` is the glossary and the authority on vocabulary — read it before naming anything, and flag conflicts rather than coining synonyms. `docs/adr/` holds the decisions and the reasoning behind them; read all four before proposing architectural changes, because several deliberately reject the obvious option. `plan.md` is the original rough brief and is superseded wherever it disagrees with those two.

## What it is

A learning platform bridging academia and industry for CS students. Onboarding places a student in a Tier, the student clears Topics by solving Practice Problems on NeetCode and bringing solutions back to be verified, and clearing Topics unlocks a Project Checkpoint where the student directs the AI instead of writing implementation code — stating requirements, reasoning through a tradeoff, then authoring a Test Specification and prompting until the tests pass.

The name "lilo-thon" is provisional. Keep it in one constant.

## Decisions already made — do not relitigate

- **24-hour demo budget** (ADR-0001). Shortcuts are deliberate. Prefer shortcuts that are additive to undo over ones that would reshape the data model or the learner-facing flow.
- **No teaching content of our own** (ADR-0002). NeetCode explains Topics and hosts Practice Problems. If you find yourself writing an explanation of how hash maps work, stop — that is the failure mode this decision exists to prevent.
- **Students pick their own language** (ADR-0003). Code therefore runs on a hosted execution service (Piston, or Judge0), never in the browser. A Test Specification is collected as data — inputs, expected outputs, named edge cases — never as language-specific test code.
- **Next.js on Vercel, no database, no auth** (ADR-0004). Progress lives in one serializable state object client-side.

Two standing rules that follow from the above: correctness is decided by *running* code, never by asking a model whether an answer looks right — the model's job is to explain a failure the harness found. And the student never hand-writes implementation code; if a surface invites them to, it contradicts Prompt, Don't Code.

## Environment

Windows 11; the primary shell is PowerShell 5.1, where `&&`, `||`, and ternary/null-coalescing operators are all parser errors. A Bash tool is also available for POSIX syntax — pick one and match its syntax rather than mixing them.
