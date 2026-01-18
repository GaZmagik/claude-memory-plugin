---
id: learning-learning-inspect-implementation-before-fixing-promotions
title: Learning - Inspect implementation before fixing promotions
type: learning
scope: project
created: "2026-01-16T18:31:46.322Z"
updated: "2026-01-16T18:31:46.322Z"
tags:
  - retrospective
  - process
  - debugging
  - project
severity: low
---

Assumption: 'promoted think memories are too large to embed'. Didn't check actual implementation first. Quick read of conclude.ts line 59-79 revealed the issue: full deliberation trail was being included in promoted content. Learning: Always inspect the code doing the thing before deciding how to fix it. Could have saved 10 minutes by reading buildPromotedContent() first.
