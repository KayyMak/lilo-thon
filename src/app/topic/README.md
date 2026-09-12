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

## Hashing

After completing Arrays, select **Continue to Hashing** or visit
`/topic/hashing`. It stays locked until Arrays is complete. Both routes share
`TopicScreen`. Hashing selects Contains Duplicate, Valid Anagram, or Longest
Consecutive Sequence based on Tier, using `src/content/hashing.ts`.

For Beginner Python, paste a `Solution` class with
`def hasDuplicate(self, nums): return len(set(nums)) != len(nums)`.
First try `return False` and confirm failures leave Hashing incomplete. Then
run the correct solution: four passes should complete Hashing and unlock the
Project Checkpoint. Refresh to verify completion and draft persistence.
Confirm the Arrays draft stays separate, and check the other Tiers and JavaScript.

The path owner should link cards to `/topic/arrays` and `/topic/hashing`.
Completed Hashing returns to the shared path.
