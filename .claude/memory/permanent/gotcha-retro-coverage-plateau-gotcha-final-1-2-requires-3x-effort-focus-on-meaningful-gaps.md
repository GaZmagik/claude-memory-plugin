---
id: gotcha-retro-coverage-plateau-gotcha-final-1-2-requires-3x-effort-focus-on-meaningful-gaps
title: "Retro - Coverage plateau gotcha: final 1-2% requires 3x effort, focus on meaningful gaps"
type: gotcha
scope: project
created: "2026-01-16T21:44:23.584Z"
updated: "2026-01-16T21:44:23.584Z"
tags:
  - retrospective
  - coverage
  - effort-estimation
  - project
severity: high
---

Session pushed coverage from 97.1% to 97.74% (+51 tests). But asymptotic returns real: refresh-frontmatter (81% → 95% was fast) vs trying to squeeze last points cost diminishing effort. Lesson: target files in 87-91% range (move, prune) before files already at 95%+. The 4.58% gap in refresh-frontmatter (uncovered: error catches, edge case URL parsing) would require 3x the effort for minimal value. Memory gotcha about asymptotic returns was correct - should've been heeded more strictly earlier.
