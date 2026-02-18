---
id: learning-speckit-analyze-cross-artifact-remediation-patterns-for-v150
title: "speckit-analyze: cross-artifact remediation patterns for v1.5.0"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T12:36:54.820Z"
updated: "2026-02-18T15:50:09.580Z"
tags:
  - speckit
  - analyze
  - remediation
  - sdd
  - v1.5.0
  - project
---

When applying speckit-analyze remediation edits across spec/plan/tasks/data-model:

1. CRITICAL fixes first (spec.md): phantom field references in SC criteria, and clamping behaviour splits (user-supplied vs internally computed) are the most impactful and must be addressed before any implementation begins.

2. New test tasks use letter suffixes (T002a, T018a) rather than renumbering to avoid breaking existing traceability links in plan.md.

3. Copy-paste traceability errors (e.g. C-I9 pointing to FR-006 instead of FR-009–FR-015) are common in plan.md when command registration patterns are reused across phases.

4. The data-model.md Edit tool requires a fresh Read in the same conversation session before editing — even if the file was read in a prior response turn.

5. --threshold flag with dual defaults (reporting vs auto-move context) is an ambiguity pattern to watch for in any CLI spec with shared filtering flags across different operation modes.
