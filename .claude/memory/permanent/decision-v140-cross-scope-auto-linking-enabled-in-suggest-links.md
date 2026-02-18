---
id: decision-v140-cross-scope-auto-linking-enabled-in-suggest-links
title: "v1.4.0: Cross-scope auto-linking enabled in suggest-links"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-17T00:27:33.050Z"
updated: "2026-02-17T08:02:05.380Z"
tags:
  - v1.4.0
  - cross-scope
  - suggest-links
  - architecture
  - project
---

Implemented cross-scope auto-linking by routing detected cross-scope memory pairs to storeCrossScopeEdge() instead of blocking them. Added MemoryMetadata tracking (basePath, scope, agent) during multi-scope loading and intelligent routing logic to distinguish same-scope pairs (linkMemories) from cross-scope pairs (storeCrossScopeEdge). Separate count tracking for reporting.
