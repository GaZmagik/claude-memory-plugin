---
id: gotcha-retro-module-level-vimock-creates-unfixable-global-test-pollution
title: Retro - Module-level vi.mock() creates global test pollution (RESOLVED)
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-28T09:21:42.419Z"
updated: "2026-03-07T18:30:52.317Z"
tags:
  - retrospective
  - process
  - testing
  - vitest
  - gotcha
  - resolved
  - project
severity: medium
---

Module-level vi.mock() in Vitest/Bun is hoisted before imports and creates persistent global pollution affecting all subsequent test files. It cannot be undone with vi.restoreAllMocks() or vi.doUnmock().

Symptoms: Tests pass in isolation but fail in full suite with cryptic errors (e.g., undefined fs functions, empty export results).

History:
- 2026-02-05: Found vi.mock("node:fs") in graph.spec.ts and vi.mock("../core/export.js") in boundary.spec.ts causing 22 failures in copy.spec.ts.
- 2026-02-28: Found vi.mock("fs"/"node:fs") in fork-detection.spec.ts, spawn-session.spec.ts, and extract-context.spec.ts causing 5 failures in session-cache.spec.ts.

Solution (applied 2026-02-28): Convert SUT to namespace imports (import * as fs from "node:fs"), replace vi.mock() with vi.spyOn(fs, "fn") in beforeEach, call vi.restoreAllMocks() in afterEach. vi.spyOn modifies namespace properties—not the module registry—so restoration works.

Prevention: Grep for "vi.mock" at module level (not inside describe/it) during code review. vi.mock for child_process (non-fs) is acceptable when the SUT uses direct named imports that cannot be spied on.
