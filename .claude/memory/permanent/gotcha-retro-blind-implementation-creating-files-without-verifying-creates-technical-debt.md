---
id: gotcha-retro-blind-implementation-creating-files-without-verifying-creates-technical-debt
title: Retro - Blind implementation (creating files without verifying) creates technical debt
type: gotcha
scope: project
created: "2026-01-25T16:26:43.746Z"
updated: "2026-01-25T16:26:43.746Z"
tags:
  - retrospective
  - process
  - implementation
  - gotcha
  - project
severity: high
---

When implementing Phase 4 T073 (ProviderConfig), I committed the interface file without ever reading it to verify it was correct. Created stubs and moved forward assuming structure was right. This pattern:

1. Wastes commit history with incomplete work
2. Creates silent bugs if the interface doesn't match usage
3. Violates 'read before modifying' principle

Better: Always Read → Verify → Implement → Commit. Even if file was just created, verify it compiles and matches expectations before moving on.
