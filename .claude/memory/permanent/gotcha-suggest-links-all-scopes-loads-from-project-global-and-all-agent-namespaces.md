---
id: gotcha-suggest-links-all-scopes-loads-from-project-global-and-all-agent-namespaces
title: suggest-links --all-scopes loads from project, global, AND all agent namespaces
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-17T00:27:23.493Z"
updated: "2026-02-17T08:02:05.341Z"
tags:
  - suggest-links
  - all-scopes
  - cross-scope
  - gotcha
  - project
---

The --all-scopes flag extends beyond just --include-shared (project + global). It loads embeddings from all registered agent scopes in addition to shared scopes. This enables comprehensive relationship discovery across isolated agent namespaces, but requires careful routing to storeCrossScopeEdge() when creating cross-agent links to avoid graph corruption.
