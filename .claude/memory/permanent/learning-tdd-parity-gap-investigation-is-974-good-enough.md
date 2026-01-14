---
id: learning-tdd-parity-gap-investigation-is-974-good-enough
title: "TDD Parity Gap Investigation: Is 97.4% Good Enough?"
type: learning
scope: project
created: "2026-01-14T08:24:08.934Z"
updated: "2026-01-14T08:24:08.934Z"
tags:
  - promoted-from-think
  - project
---

# TDD Parity Gap Investigation: Is 97.4% Good Enough?

## Conclusion

The 97.4% gap warrants brief investigation (30 min max) to identify the 2 phantom functions. If they're parser limitations, document them; if real gaps, add tests. The TDD parity tool is useful as a signal, not gospel - understanding what we're measuring matters more than hitting 100%.

## Deliberation Trail

_Promoted from think document: `thought-20260114-081601968`_

### Thought

Initial observation: The hooks parity report shows a contradiction - claims 'all public functions have some test coverage' but reports 76/78 (97.4%). This 2-function gap could be: (1) a real coverage gap, (2) a TypeScript regex parser limitation, or (3) a counting quirk in how the tool handles class methods vs standalone functions.

### Thought (claude:haiku [ae3a8784-588e-468c-a975-b9e9199b834f])

The contradiction you've identified is worth unpacking more carefully. The "all public functions have some test coverage" message is likely checking presence of *any* test reference (even a stub or skip), while the 76/78 count is stricter - probably requiring actual executable test assertions.

### Counter-argument (claude:haiku [4dfab8e2-7423-4025-af95-661993bc9ca7])

Accepting 97.4% creates a false standard that will haunt you later. Here's why this matters:

### Alternative (claude:haiku [540b3ffe-1ddf-4985-9add-495a2b89a853])

The gap between "all public functions have some test coverage" and the 76/78 count points to a systematic blind spot in how we're measuring. Rather than accepting 97.4% as "good enough", we should treat this as a debugging problem with specific steps:

### Thought

Manual thought - no AI invocation. Should have no 'by' field unless I add --by manually.

### Thought (Human tester)

Manual thought with attribution - should show 'by' as 'Human tester'

### Thought (claude:haiku  [65cceb0d-49c8-4ad4-8f69-c5b290a61052])

The real issue here is that you're treating a measurement discrepancy as if it's a philosophical question about acceptable thresholds, when it's actually a debugging problem masquerading as a standards discussion.

### Thought (claude:haiku [9a2f1c78-49b2-4183-9489-3c9dd9ec88ae])

The 97.4% figure masks a fundamental asymmetry: the parity tool is measuring *function existence* against *test existence*, not *test coverage quality*. A function could have a test file that imports it, fails to call it, or calls it with stub assertions—all of which would register as 'covered' in a regex scan. The real question isn't whether 2 functions are missing tests, but whether the 76 functions that supposedly have tests are actually being *exercised meaningfully*. This suggests the parity gap is a symptom of a larger measurement blindness rather than a minor oversight.

### Thought

The 97.4% gap warrants brief investigation (30 min max) to identify the 2 phantom functions. If they're parser limitations, document them; if real gaps, add tests. The TDD parity tool is useful as a signal, not gospel - understanding what we're measuring matters more than hitting 100%.

