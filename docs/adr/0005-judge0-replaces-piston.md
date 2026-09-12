---
status: accepted
---

# Judge0 replaces Piston as the execution service

The public Piston API became whitelist-only on 2026-02-15 and now returns HTTP 401 for every execution request. This was found during the Stage 1 spike, before any code depended on it. Its `/runtimes` endpoint is still public and answers cheerfully with 87 runtimes, which makes the service look healthy right up until you attempt the operation you actually need — the reason the spike tests execution itself rather than anything adjacent to it.

Judge0's public CE instance runs the same workload with no API key, at roughly 900ms for Python and 2.5s for JavaScript. It was verified against correct, wrong-answer, crashing, syntactically invalid, misnamed and fence-wrapped submissions before being adopted, because a harness that cannot detect failure is worse than no harness.

Execution now sits behind one interface in `src/lib/execution`, and nothing outside that directory knows which service is in use. A third replacement costs one adapter file. Successful runs are cached by a hash of language, source and cases — not as a performance tweak, but because the public instance has undocumented rate limits and a build re-runs the same handful of solutions constantly.

Judge0's own availability carries the same class of risk that just removed Piston. That is accepted rather than solved: the judged artifact is a recorded demo, so a service outage during judging cannot break the submission, and the interface keeps an in-browser engine (Pyodide for Python, native execution for JavaScript) available as a contained fallback rather than a rewrite.
