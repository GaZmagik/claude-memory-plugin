---
id: decision-mermaid-include-shared-defaults-to-all-scopes
title: Mermaid --include-shared defaults to all shared nodes, not just linked
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-06T00:29:17.367Z"
updated: "2026-02-16T22:30:07.437Z"
tags:
  - mermaid
  - phase-e
  - ux-decision
  - scope-crossing
  - project
---

When --include-shared is used without --filter-linked, mermaid includes ALL project/global nodes in diagram, not just those with edges to agent nodes. Cross-scope links aren't practical, so this provides better UX. --filter-linked flag activates edge-based filtering for power users.
