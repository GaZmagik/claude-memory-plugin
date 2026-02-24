---
id: learning-export-validation-utilities-for-cross-module-reuse
title: export validation utilities for cross-module reuse
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T22:36:04.046Z"
updated: "2026-02-23T22:36:09.635Z"
tags:
  - exports
  - validation
  - reusable-patterns
  - project
---

Exported validateLlmLabel() and VALID_LABEL_RE from suggest-links.ts for reuse in scoreEdges(). Label validation (lowercase alphanumeric + hyphens, 1-64 chars) is reusable across modules. Consider this pattern when building shared validators.
