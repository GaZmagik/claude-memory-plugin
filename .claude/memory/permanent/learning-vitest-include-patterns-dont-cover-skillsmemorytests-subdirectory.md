---
id: learning-vitest-include-patterns-dont-cover-skillsmemorytests-subdirectory
title: Vitest include patterns don't cover skills/memory/tests/ subdirectory
type: learning
scope: project
created: "2026-02-05T23:49:13.832Z"
updated: "2026-02-05T23:49:13.832Z"
tags:
  - vitest
  - test-configuration
  - include-patterns
  - build-tools
  - project
---

vitest.config.ts defines include: ['tests/integration/**/*.spec.ts', 'skills/memory/src/**/*.spec.ts'] which covers root tests/integration/ but NOT skills/memory/tests/integration/. Tests in skills/memory/tests/ must be run via bun test directly, not through vitest CLI with filtered patterns.
