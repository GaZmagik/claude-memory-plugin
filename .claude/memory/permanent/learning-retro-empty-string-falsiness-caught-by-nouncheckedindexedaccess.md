---
id: learning-retro-empty-string-falsiness-caught-by-nouncheckedindexedaccess
title: Retro - Empty string falsiness caught by noUncheckedIndexedAccess
type: learning
scope: project
created: "2026-01-18T19:05:13.985Z"
updated: "2026-01-18T19:05:13.985Z"
tags:
  - retrospective
  - process
  - typescript
  - strictness
  - project
severity: low
---

The extractBody() function bug (empty string after frontmatter treated as falsy) was a classic JavaScript gotcha that the noUncheckedIndexedAccess check should have surfaced earlier. Fix was simple (`frontmatterMatch[1] !== undefined` instead of truthy check), but demonstrates the value of strict index access checks. This pattern will catch similar bugs in captured group handling across the codebase.
