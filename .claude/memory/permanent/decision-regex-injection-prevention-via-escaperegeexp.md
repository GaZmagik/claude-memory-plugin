---
id: decision-regex-injection-prevention-via-escaperegeexp
title: Use escapeRegExp for user input in regex patterns
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T17:29:15.277Z"
updated: "2026-02-23T17:29:22.680Z"
tags:
  - suggest-links
  - security
  - regex
  - injection
  - project
---

Escape user input with escapeRegExp (or regexp.escape) before constructing RegExp objects. Applies to migrations like think-migration.ts that dynamically build regex patterns from IDs or content. Prevents regex injection (CWE-94).
