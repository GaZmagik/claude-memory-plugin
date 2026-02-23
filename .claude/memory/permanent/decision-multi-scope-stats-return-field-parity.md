---
id: decision-multi-scope-stats-return-field-parity
title: Multi-scope stats returns must include all expected fields (nodes alias)
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-23T09:32:18.046Z"
updated: "2026-02-23T09:32:22.595Z"
tags:
  - stats
  - multi-scope
  - return-types
  - project
---

PR #41 fixed query.ts where multi-scope stats return didn't include nodes alias field, causing undefined values for callers. Decision: when consolidating multi-scope results, ensure return objects include all expected fields present in single-scope paths. This prevents partial struct issues.
