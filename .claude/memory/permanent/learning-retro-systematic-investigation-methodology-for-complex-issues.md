---
id: learning-retro-systematic-investigation-methodology-for-complex-issues
title: Retro - Systematic investigation methodology for complex issues
type: learning
scope: project
created: "2026-01-18T10:34:33.781Z"
updated: "2026-01-18T10:34:33.781Z"
tags:
  - retrospective
  - process
  - debugging
  - memory-skill
  - project
severity: medium
---

When facing a complex problem with multiple symptoms (92 embedding failures with different error types), starting with systematic root cause analysis is more effective than trying to fix individual issues. In this case: traced 'path traversal' errors → found corrupt index → discovered unquoted YAML → fixed systematically. The corrupted index with ../../../.claude/memory/ paths was the real culprit; many individual errors were secondary symptoms.
