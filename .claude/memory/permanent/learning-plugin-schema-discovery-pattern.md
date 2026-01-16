---
id: learning-plugin-schema-discovery-pattern
title: Plugin schema uncertainty wasted time—validate against official spec early
type: learning
scope: project
created: "2026-01-16T07:46:45.793Z"
updated: "2026-01-16T07:46:45.793Z"
tags:
  - retrospective
  - process
  - plugin-development
  - project
---

Spent significant time debugging why plugin wasn't loading with 'components' field. Root cause: docs said auto-discovery was supported, but didn't clearly state 'components' nesting was unsupported. Fix: Validate plugin.json schema against official reference BEFORE debugging. Official schema uses flat top-level fields (name, version, description, author, license, keywords) not nested under 'components'. Lesson: When format-related errors occur, consult official spec immediately rather than trial-and-error.
