---
id: learning-retro-systematic-type-error-reduction-more-efficient-than-scatter-fix-approach
title: Retro - Systematic type error reduction more efficient than scatter-fix approach
type: learning
scope: project
created: "2026-02-07T09:23:16.439Z"
updated: "2026-02-07T09:23:16.439Z"
tags:
  - retrospective
  - process
  - typescript
  - efficiency
  - project
severity: medium
---

When facing large numbers of TypeScript errors (75+ in this case), categorising them by root cause and fixing entire categories at once is substantially more efficient than fixing errors in arbitrary order. Grouping by: (1) unused imports, (2) mock type completeness, (3) result type narrowing, (4) enum mismatches allowed parallel edits and prevented re-running tsc multiple times. Approach: tsc → grep for patterns → batch edits by category rather than one-by-one sequential fixes.
