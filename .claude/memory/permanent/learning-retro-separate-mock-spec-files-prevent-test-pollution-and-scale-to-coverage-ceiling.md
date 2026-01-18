---
id: learning-retro-separate-mock-spec-files-prevent-test-pollution-and-scale-to-coverage-ceiling
title: Retro - Separate mock spec files prevent test pollution and scale to coverage ceiling
type: learning
scope: project
created: "2026-01-16T21:10:10.061Z"
updated: "2026-01-16T21:10:10.061Z"
tags:
  - retrospective
  - testing
  - coverage
  - vitest
  - mocking
  - edge-cases
  - project
severity: high
---

Session achieved 97.1% line coverage (1783 passing tests) by using dedicated *-mocks.spec.ts files for edge case testing. Pattern: Main .spec.ts covers happy paths with minimal mocking; separate -mocks.spec.ts covers catch blocks and error scenarios using vi.spyOn() for isolation. Applied to: index.ts (95→100%), sync-frontmatter.ts (96.77→100%), promote.ts (89→100%), pattern-matcher.ts (96.15→100%). Clean separation prevents vi.mock() global pollution while enabling fine-grained error path coverage. Asymptotic returns kick in around 95% - final 5% requires proportionally more effort but pattern makes it tractable.
