---
id: learning-metadata-tracking-pattern-for-multi-scope-suggest-links-operations
title: Metadata tracking pattern for multi-scope suggest-links operations
type: learning
scope: project
created: "2026-02-17T00:27:14.798Z"
updated: "2026-02-17T00:27:14.798Z"
tags:
  - suggest-links
  - multi-scope
  - pattern
  - metadata
  - project
---

Multi-scope memory loading requires tracking (basePath, scope, agent) metadata on each loaded memory to enable cross-scope detection during suggestion generation. Scope type is derived from path comparison: if basePath differs between source and target, mark as isCrossScope. This enables intelligent routing without requiring explicit scope parameters.
