# unlocked

A learning platform bridging academia and industry for CS students. Onboarding places a student in a Tier, the student clears Topics by solving problems on NeetCode and bringing solutions back to be verified by actually running them, and clearing Topics unlocks a Project Checkpoint where the student directs an AI instead of writing implementation code — stating requirements, reasoning through a tradeoff, then specifying tests and prompting until they pass.

Built for a 24-hour judged demo.

## Documents

Read these before writing code. They are the design, and they disagree with nothing else in the repo.

| File | What it is |
|---|---|
| `CONTEXT.md` | Glossary. The authority on vocabulary |
| `docs/BUILD-SPEC.md` | Implementation spec, demo spine, build order |
| `docs/adr/` | Four decisions and why they were made |
| `CLAUDE.md` | Orientation for Claude Code |
| `plan.md` | Original rough brief. Superseded where it disagrees |

## Running it

```bash
npm install
npm run dev      # dev server on :3000
npm run build    # production build
npm run lint     # eslint
```

Then open http://localhost:3000.

### Environment

Create `.env.local`:

```
ANTHROPIC_API_KEY=...
```

The key is used only from server routes and must never reach the client. Code execution runs against the public Judge0 CE instance, which needs no key.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind, deployed on Vercel. No database and no authentication — student progress lives in one serializable object in `localStorage`. That is deliberate; see ADR-0001 and ADR-0004.

## Contributing

See `CONTRIBUTING.md` for area ownership, commit conventions, and what is deliberately not being built.
