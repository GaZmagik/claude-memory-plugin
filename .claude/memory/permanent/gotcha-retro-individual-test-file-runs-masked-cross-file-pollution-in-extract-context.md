---
id: gotcha-retro-individual-test-file-runs-masked-cross-file-pollution-in-extract-context
title: Retro - Individual test file runs masked cross-file pollution in extract-context
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-28T09:19:44.395Z"
updated: "2026-02-28T09:20:43.773Z"
tags:
  - retrospective
  - process
  - testing
  - bun
  - module-pollution
  - project
severity: medium
---

When fixing module-level vi.mock() pollution, tested fork-detection.spec.ts and spawn-session.spec.ts individually and both passed. False confidence led to skipping full suite test until after source changes. Only full suite run revealed extract-context.spec.ts also had identical pollution issue. Applied fix retroactively. Learning: Always run full test suite first when fixing module/registry-level issues, not individual files. Individual runs can pass despite global state problems that surface in combined execution.
