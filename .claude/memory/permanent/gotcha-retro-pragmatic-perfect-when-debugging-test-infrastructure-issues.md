---
id: gotcha-retro-pragmatic-perfect-when-debugging-test-infrastructure-issues
title: Retro - Pragmatic >perfect when debugging test infrastructure issues
type: gotcha
scope: project
created: "2026-01-16T17:06:20.387Z"
updated: "2026-01-16T17:06:20.387Z"
tags:
  - retrospective
  - process
  - testing
  - pragmatism
  - project
severity: high
---

Test pollution from vi.mock() across 357 tests. Four options offered: 1) Process isolation (--pool=forks) - fastest, slowest runtime. 2) isolate=true in vitest.config - quick config, moderate slowdown. 3) vi.restoreAllMocks() - proper refactoring, time-intensive. 4) Test quarantine - surgical, requires 4 specific files.

Chose Option 4 (proper) mid-session expecting 30min. Reality: Requires careful reading of 3 large test files, understanding mock patterns, adding cleanup systematically. Interrupted at compaction.

Lesson: When facing infrastructure issues with time/context pressure, commit to pragmatic solution immediately. Save proper refactoring for dedicated cleanup phase with fresh context. Could have enabled isolate=true in 2min, gotten green tests, deferred mock cleanup.
