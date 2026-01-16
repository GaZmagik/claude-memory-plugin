---
id: learning-retro-trust-gotcha-memory-before-investigating-duplicates
title: Retro - Trust gotcha memory before investigating duplicates
type: learning
scope: project
created: "2026-01-16T17:45:54.596Z"
updated: "2026-01-16T17:45:54.596Z"
tags:
  - retrospective
  - process
  - memory-system
  - efficiency
  - project
severity: medium
---

When encountering a known problem (vi.mock pollution, test failures), check memory system's gotcha collection FIRST before investigating. Session spent 30+ minutes re-discovering that vi.resetModules() makes things worse and process isolation is the fix—all documented in gotcha-vi-mock-global-pollution. Early gotcha lookup saves investigation time.
