---
id: gotcha-gotcha-enforcement-hook-that-wasnt-tested-violated-its-own-rules-meta
title: Gotcha - Enforcement hook that wasn't tested violated its own rules (meta)
type: gotcha
scope: project
created: "2026-01-17T13:19:03.901Z"
updated: "2026-01-17T13:19:03.901Z"
tags:
  - retrospective
  - tdd
  - gotcha
  - meta
  - project
severity: medium
---

The TDD enforcement hook (tdd-typescript.ts) was itself not tested, ironically violating the rules it enforces. The stricter 'touch-only' rule change immediately blocked all subsequent edits. Prevention: Apply enforcement hooks to themselves first - use git pre-commit or setup script to verify. Enforcement tools must be tested before deployment or they become friction. Learning: Meta-enforcement (enforce on the enforcer) is essential for credibility.
