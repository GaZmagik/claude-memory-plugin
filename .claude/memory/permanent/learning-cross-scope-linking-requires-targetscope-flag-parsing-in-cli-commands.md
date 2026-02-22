---
id: learning-cross-scope-linking-requires-targetscope-flag-parsing-in-cli-commands
title: Cross-scope linking requires targetScope flag parsing in CLI commands
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T05:31:59.496Z"
updated: "2026-02-21T05:32:14.113Z"
tags:
  - graph-operations
  - cross-scope
  - cli-design
  - flag-parsing
  - project
---

Implementing cross-scope linking (local → project, project → global) required: (1) scopeToIdentifier() helper to convert Scope enum to string, (2) --target-scope flag parsing in cmdLink/cmdUnlink, (3) scope validation in validateScopeFlags(). Pattern: extract flag, validate both scopes, detect if cross-scope, pass to LinkMemories operation.
