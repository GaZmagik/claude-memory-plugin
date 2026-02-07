---
id: artifact-include-shared-validation-pattern
title: Validation pattern for --include-shared flag enforcement
type: artifact
scope: project
created: "2026-02-04T09:48:47.702Z"
updated: "2026-02-04T09:48:47.702Z"
tags:
  - pattern
  - validation
  - include-shared
  - feature-003
  - reusable
  - project
---

Create validateIncludeShared() helper that checks: (1) if --include-shared is used, --agent flag MUST be present, (2) return error if validation fails. Apply to all write operations (reject --include-shared) and read operations (allow with --agent). Pattern prevents accidental cross-scope operations and ensures agent context is available for multi-scope searches.
