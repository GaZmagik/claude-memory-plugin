---
id: learning-phase-d-test-suite-failures-resolved
title: "Phase D Test Suite: 3 Pre-Existing Failures Fixed"
type: learning
scope: project
created: "2026-02-04T16:57:47.830Z"
updated: "2026-02-04T16:57:47.830Z"
tags:
  - testing
  - phase-c
  - phase-d
  - completion
  - project
---

Scope enum test (expected 4 scopes, now 6 with agent additions), agent name sanitisation in getAgentDirectoryPath (was calling but not actually being used), and cmdExport timeout (needed vi.mock for exportMemories to avoid filesystem I/O). All 2,263 tests now passing.
