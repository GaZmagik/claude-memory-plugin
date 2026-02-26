---
id: learning-retro-polyfill-approach-avoids-large-test-infrastructure-refactors
title: Retro - Polyfill approach avoids large test infrastructure refactors
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-26T14:11:09.601Z"
updated: "2026-02-26T14:11:47.277Z"
tags:
  - retrospective
  - process
  - testing
  - bun
  - vitest
  - project
severity: medium
---

When test runners (Bun) lack vitest compatibility features like vi.hoisted(), a minimal preload setup script with polyfills is more efficient than restructuring the entire test suite. This pattern (vi.hoisted = (fn) => fn()) can be applied to other missing vitest shims in Bun with a single --preload flag in package.json scripts.
