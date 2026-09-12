---
status: proposed
---

# How much of a Project Checkpoint the AI writes depends on Tier

Prompt, Don't Code assumed every student can already write the implementation they are directing the AI to produce. A Beginner often cannot, and letting the AI write it anyway produces a student who can steer code they cannot read and can only judge it by whether tests pass. That is the classroom-to-industry gap reproduced, not closed. So the Checkpoint hands implementation to the AI in steps, by Tier:

- **Beginner** — the student writes the implementation. The AI gives Socratic Hints only and never writes implementation code.
- **Intermediate** — the AI writes the implementation, and before it runs, the student must explain what it does. The model evaluates that explanation the way it evaluates Tradeoff reasoning; it still never decides whether the code is correct. A weak explanation gets one retry, with the model saying what is missing. After that retry the tests run regardless, and the model's feedback on the explanation is shown beside the results.
- **Advanced** — Prompt, Don't Code as originally defined.

Every Tier still goes through the Requirements Phase, the Tradeoff Phase and authors a Test Specification. Only who writes the implementation changes, and correctness is still decided by running the code against the student's tests.

## Considered options

- **Keep Prompt, Don't Code for everyone** and rely on the Topic Learning Loop, where every student hand-writes Practice Problem solutions, to build the skill. Rejected: solving Two Sum does not show a student can write a small program from their own requirements.
- **Keep the AI writing for everyone, but make Beginners predict results or explain lines first.** Cheaper, and still a sensible stopgap, but it tests reading AI code rather than writing any, which is the exact skill a Beginner lacks.

A weak explanation gets exactly one retry. Blocking until the explanation is good enough would let the model decide whether a student may proceed, and the model can be wrong: a student with a sound but oddly worded explanation would be stuck behind it, which on stage is a demo that stalls. Never blocking would let a student type anything and move on. One retry makes the student actually try to understand the code, and no one gets stuck behind a judgment the model might get wrong. Showing the feedback next to the results also connects the two, e.g. "you said it handles ties, but the tie case failed."

## Consequences

- **Prompt, Don't Code becomes the advanced mode, not the universal rule.** `CONTEXT.md`, `CLAUDE.md` and the one rule in `docs/BUILD-SPEC.md` all state it as universal and need rewording once this is accepted.
- **Tier now affects more than two things.** The spec limits Tier to problem difficulty and coach scaffolding; this adds the Checkpoint mode.
- **Beginners need somewhere to write code in the Checkpoint.** The only thing that exists today is the Topic view's paste-back, so reuse that — paste code in, it runs on Judge0 — rather than building an editor. The rule against editing generated code by hand still applies at Intermediate and Advanced.
- **Checkpoint state gains a mode**, and at Intermediate an explanation, its verdict, and whether the retry has been used. Add these as fields rather than reshaping the object (ADR-0001).
- **The demo spine does not change.** Demo as an Intermediate or Advanced student. Beginner mode is additive and can land after the demo.

## Moving up a Tier

Onboarding sets where a student starts, not where they stay. A Beginner should be able to go from writing code in their first Checkpoint to directing the AI without starting over, while someone with experience starts at a higher Tier. Starting higher never means skipping Topics: every student starts at the first Topic, and Tier changes only how hard its Practice Problems are and how much the student is left to do alone. So a student moves up one Tier after completing a Checkpoint — but only when the Checkpoint showed the skill of the Tier they are in, not just that they reached the end:

- **Beginner → Intermediate** when their own implementation passes all of their tests.
- **Intermediate → Advanced** when their explanation was accepted, on the first try or the retry. Getting through only because the retry ran out does not count.

Moving up is a reducer action like any other, and it changes nothing already completed. Nobody moves down.
