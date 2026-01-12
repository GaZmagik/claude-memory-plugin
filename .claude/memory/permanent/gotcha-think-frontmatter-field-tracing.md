---
type: gotcha
title: Think frontmatter fields must be traced through full serialisation stack
topic: Type definition and implementation alignment
created: 2026-01-12T10:45:00.000Z
updated: 2026-01-12T10:45:00.000Z
tags: [think, frontmatter, gotcha, feature-001, typescript]
severity: high
---

New frontmatter fields (topic, status, conclusion, promotedTo) must be added to ALL of:

1. `ThinkFrontmatter` interface in types/think.ts
2. `serialiseThinkFrontmatter()` function (output to YAML)
3. `parseThinkFrontmatter()` function (input from YAML)
4. Any validation that checks frontmatter structure
5. Any functions that create or update frontmatter

Forgetting even one location causes silent data loss or parsing failures. The issue only surfaces when a field is written then read back (or used by downstream code).

Lesson from base memory implementation: always trace structural changes through the full stack before declaring complete.
