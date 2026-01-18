---
id: learning-retro-comprehensive-callsite-exploration-prevents-scope-creep-in-refactoring
title: Retro - Comprehensive callsite exploration prevents scope creep in refactoring
type: learning
scope: project
created: "2026-01-18T15:16:02.354Z"
updated: "2026-01-18T15:16:02.354Z"
tags:
  - retrospective
  - process
  - planning
  - project
severity: medium
---

When planning async conversions, use subagents to exhaustively find ALL callsites before estimating. Initial fs-utils estimate was 4h (foundation only), but exploration revealed 17 files affected with cascading think/state.ts changes. Comprehensive map before planning prevented mid-implementation scope changes.
