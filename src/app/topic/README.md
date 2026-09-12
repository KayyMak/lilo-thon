# Topic screen

Open `/onboarding` to choose a Tier and language, then visit `/topic/arrays`.
Arrays selects its Practice Problem from `src/content/arrays.ts` and posts
`language`, `source`, `entryPoint`, and `cases` to `/api/run`.

The paste adapter supports standalone functions and NeetCode `Solution` classes.
The response arrives as one batch; each pending case has its own skeleton row.
Only a complete response with every case passing dispatches `solveProblem`.
The shared progress provider persists completion and unlocks Hashing.
Pasted drafts save to localStorage on each change, separately for each problem
and language, and restore after refreshing. Clearing the box removes its draft.

## Validation

Run `npm run lint` and `npm run build`.
Paste code and refresh before submitting; the exact text should return. Repeat
after passing and failing runs. Clear the box and refresh to verify it stays
empty. Different problems and languages should retain separate drafts.
For a manual check, select Beginner and Python, then paste:

```python
class Solution:
    def getConcatenation(self, nums: List[int]) -> List[int]:
        return nums + nums
```

Confirm three skeleton rows appear immediately, three real passes appear after
the response, and Arrays stays complete after refreshing. Before the passing
run, try `return nums` and invalid Python: neither should complete Arrays.
Disconnect the network and check that the error allows retry without losing
the pasted solution. Repeat with JavaScript and the other Tier assignments.

The path screen must link to `/topic/arrays`; its implementation belongs to the
path owner. Hashing's screen is not implemented here yet.
