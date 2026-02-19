---
id: decision-feature-005-index-entry-optional-fields
title: "Feature 005: IndexEntry optional fields for external file support"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-19T08:45:21.893Z"
updated: "2026-02-19T08:45:35.610Z"
tags:
  - feature-005
  - type-system
  - backwards-compatibility
  - project
---

Add externalFileKind and externalPath as optional fields (?) to IndexEntry interface. Maintains backwards compatibility; existing entries without these fields continue working. Only external rule/reminder nodes populate them. Matches established optional field pattern (severity, agent).
