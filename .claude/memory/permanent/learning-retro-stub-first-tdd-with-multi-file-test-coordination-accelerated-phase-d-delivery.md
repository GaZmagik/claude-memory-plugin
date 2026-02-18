---
id: learning-retro-stub-first-tdd-with-multi-file-test-coordination-accelerated-phase-d-delivery
title: Retro - Stub-first TDD with multi-file test coordination accelerated Phase D delivery
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T18:10:36.331Z"
updated: "2026-02-18T18:11:45.759Z"
tags:
  - retrospective
  - process
  - tdd
  - phase-d
  - project
severity: high
---

Writing failing test assertions across multiple spec files (link-update.spec, suggest-links.spec, ollama.spec) BEFORE implementation created a clear contract for what needed to be wired. This forced deliberate structure and prevented hook-blocking overwrites. The pattern: (1) Add all failing test assertions first, (2) Verify they fail red, (3) Implement across files with coordinated changes, (4) Verify all green. Far more effective than sequential file-by-file implementation.
