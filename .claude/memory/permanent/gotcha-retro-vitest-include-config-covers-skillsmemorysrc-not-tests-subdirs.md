---
id: gotcha-retro-vitest-include-config-covers-skillsmemorysrc-not-tests-subdirs
title: Retro - Vitest include config covers skills/memory/src not tests subdirs
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:18:35.407Z"
updated: "2026-02-16T22:30:07.154Z"
tags:
  - retrospective
  - vitest
  - config
  - test-structure
  - project
severity: high
---

vitest.config.ts includes 'skills/memory/src/**/*.spec.ts' but NOT 'skills/memory/tests/**/*.spec.ts'. Phase E tests live in skills/memory/tests/integration/ which vitest doesn't discover. This creates confusion about test file placement. Either update vitest config to cover tests/ subdirectory or enforce tests/ colocate-with-source pattern. Document the chosen convention clearly.
