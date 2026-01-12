---
type: decision
title: Hook separation clarified enforcement boundaries
created: "2026-01-12T20:40:17.712Z"
updated: "2026-01-12T20:40:17.712Z"
tags:
  - retrospective
  - process
  - architecture
  - memory-plugin
  - hooks
  - project
scope: project
---

# Retrospective: Hook Separation Clarified Enforcement

Initially attempted single unified hook. Separated into:
- protect-memory-directory.ts: Blocks Write/Edit/MultiEdit file tools
- enforce-memory-cli.ts: Blocks bash operations (rm, mv, cp, redirects)

Benefit: Each hook has single responsibility, clear messaging, independent test suites (25 tests total). Pattern matching is localized and easier to audit.

Key insight: Multi-concern hooks become maintenance nightmares. Separation enabled clear whitelisting (memory CLI, read-only ops) without conflicting logic paths.
