---
id: artifact-validation-pattern-include-shared-flag
title: Validation pattern for --include-shared flag enforcement
type: artifact
scope: project
created: "2026-02-04T08:37:28.309Z"
updated: "2026-02-04T09:55:16.807Z"
tags:
  - validation-pattern
  - flag-enforcement
  - include-shared
  - project
  - feature-003
---

Pattern: Check for --include-shared flag in write operations (cmdWrite, cmdDelete, cmdTag, cmdLink, cmdSync) and return error immediately. For read operations, require --agent flag when --include-shared is set. Validation happens inline in command handlers with early returns using getFlagBoolean() checks.
