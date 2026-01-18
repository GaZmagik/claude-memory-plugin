---
id: learning-retro-dateprototype-mocking-enables-pure-function-testing-without-fakes
title: Retro - Date.prototype mocking enables pure function testing without fakes
type: learning
scope: project
created: "2026-01-18T13:56:16.826Z"
updated: "2026-01-18T13:56:16.826Z"
tags:
  - retrospective
  - testing
  - mocking
  - pattern
  - project
severity: medium
---

When pure functions depend on Date (like createFrontmatter), use vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(...) instead of mocking the function itself. Allows function to run naturally with deterministic output. Avoided bun/vitest fake timer complexity (setSystemTime not available). Reduced 17 mocks to 9 while maintaining test integrity.
