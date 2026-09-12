# Students choose their language, so code runs on a hosted execution service

Students are never forced into a particular programming language, for either a Practice Problem solution or a Project Checkpoint. That rules out running code in the browser, since no browser sandbox covers the range of languages students will actually pick, and it rules out a self-hosted container sandbox as too much work for the timebox. Code therefore runs on a hosted execution service (Piston, or Judge0 as the alternative), reached over HTTP with source and input, returning output and exit status.

One service covers both uses: verifying a solution brought back from NeetCode, and running the AI-generated implementation against the student's tests.

The knock-on effect is that a Test Specification must be collected as data rather than as test code, because test code would be language-specific. This turns out to reinforce Prompt, Don't Code rather than compromise it — the student states behaviour and lilo-thon generates the runner for their chosen language, so the student stays at the level of specification throughout.

**Amended by ADR-0005.** The service is Judge0, not Piston, which went whitelist-only before we depended on it. The decision recorded here — students choose the language, so execution is hosted rather than in-browser — is unchanged.
