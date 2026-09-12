# lilo-thon

"lilo-thon" is the repository name and a working title only; the product name is undecided, so it belongs in a single constant rather than scattered through the interface. A learning platform that takes CS and engineering students from classroom knowledge to industry-capable, by routing them through data structures and algorithms practice and then into projects where the student directs the AI rather than writing implementation code.

## Language

**Tier**:
The placement a student receives from onboarding — Beginner, Intermediate, or Advanced. A difficulty setting applied to the same experience, not a separate curriculum.
_Avoid_: level, track, Expert

**Topic**:
One unit of DSA subject matter, such as Arrays or Hashing. The thing a student completes to make progress.
_Avoid_: module, lesson, unit, chapter

**Practice Problem**:
A single exercise a student solves to demonstrate grasp of a Topic. A Topic is completed by solving several of them.
_Avoid_: question, exercise, challenge, kata

**Topic Learning Loop**:
The repeating cycle within one Topic: the student is routed out to NeetCode for the explanation and the Practice Problems, returns with a solution, and the Topic is marked complete once enough problems are cleared. lilo-thon routes and verifies; it does not teach the concept itself.

**Topic Completion**:
The bar a student must clear for a Topic to count as done and for the next thing to unlock. Because the work happens off-platform, completion is something the student demonstrates on return by supplying a working solution in a language of their own choosing, never something lilo-thon observes directly.

**Socratic Hint**:
Guidance that moves a stuck student forward without supplying the answer or the implementation. The defining constraint on how the tutor may respond.
_Avoid_: hint, help, solution

**Project Checkpoint**:
A project that unlocks after a set of Topics is complete, where the student applies those Topics by directing the AI. Occurs repeatedly — Topics, then a Checkpoint, then more Topics.
_Avoid_: capstone, final project

**Prompt, Don't Code**:
The governing rule of a Project Checkpoint: the student produces requirements, design decisions, and tests, and the AI produces all implementation code. The student never hand-writes the implementation.

**Requirements Phase**:
The opening stage of a Project Checkpoint, where the student states what the project must do, which Topics it draws on, and its edge cases — before any code exists. The AI challenges vague answers.

**Tradeoff Phase**:
The stage where the AI puts a design decision to the student (array here or hashmap?) and the student must reason it through using what the Topics taught.

**Test-Driven Prompting Phase**:
The stage where the student authors a Test Specification first, then prompts the AI for code satisfying it, then diagnoses failures and re-prompts. Verification and debugging happen through prompting, never through editing the implementation.

**Test Specification**:
The student's statement of required behaviour as data — inputs paired with expected outputs, plus named edge cases — rather than as test code in any particular language. What the student authors in place of writing tests by hand.
_Avoid_: test suite, unit tests, assertions
