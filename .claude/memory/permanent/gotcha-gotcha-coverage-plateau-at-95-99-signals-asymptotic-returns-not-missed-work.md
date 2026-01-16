---
id: gotcha-gotcha-coverage-plateau-at-95-99-signals-asymptotic-returns-not-missed-work
title: Gotcha - Coverage plateau at 95-99% signals asymptotic returns, not missed work
type: gotcha
scope: project
created: "2026-01-16T21:10:28.944Z"
updated: "2026-01-16T21:10:28.944Z"
tags:
  - retrospective
  - testing
  - coverage
  - risk
  - pragmatism
  - project
severity: high
---

When pushing from 95% to near-100% coverage, expect exponential effort increase. refresh-frontmatter.ts (81.85%) and ai-invoke.ts (39.18%) remain low because they involve complex logic or AI mocking that's hard to test reliably. Files at 99%+ (frontmatter.ts 99.21%, edges.ts 99.11%, traversal.ts 99.35%) likely have legitimately unreachable code or extremely difficult edge cases. Lesson: Don't force the final 1-2% on every file. Pragmatic ceiling is 95-97% coverage across a project. Focus on functional importance: prioritize core.write.ts, core.index.ts over maintenance.refresh_frontmatter.ts for ROI.
