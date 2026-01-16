---
id: learning-retro-coverage-asymptotic-returns-99-becomes-exponentially-harder
title: Retro - Coverage asymptotic returns - 99%+ becomes exponentially harder
type: learning
scope: project
created: "2026-01-16T20:25:03.409Z"
updated: "2026-01-16T20:25:03.409Z"
tags:
  - retrospective
  - testing
  - coverage
  - vitest
  - project
severity: medium
---

After reaching 99%+ line coverage on multiple files (import.ts 99.34%, maintenance.ts 99.38%, conclude.ts 99.46%), the final 0.66-1% requires disproportionate effort. Remaining uncovered lines are branch paths in catch blocks, default cases in type mappers, or promotion failure scenarios. Standard test patterns (mock dependency, verify error) yield diminishing returns. 99% appears to be the practical ceiling for well-tested error handling code without major architectural changes. Distinguish between 'important coverage gaps' (error paths, main logic branches) vs 'asymptotic tail' (final 1% requiring synthetic state or branch-specific mocking).
