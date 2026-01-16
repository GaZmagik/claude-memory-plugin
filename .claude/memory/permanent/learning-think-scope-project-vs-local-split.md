---
id: learning-think-scope-project-vs-local-split
title: Think scope - Project vs Local split
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T21:54:49.697Z"
updated: "2026-01-16T23:10:42.381Z"
tags:
  - think
  - scope
  - architecture
  - feature-001
  - typescript
  - project
---

Think documents support both Project scope (visible to team) and Local scope (gitignored, private).

Enables scoped deliberations: team discussions in Project scope (tracked in git), personal thinking in Local scope (gitignored). This is an improvement over the bash implementation which only supported single scope.

Implementation uses `Scope.Project` and `Scope.Local` with separate temporary directories per scope. State file `thought.json` tracks current document with scope context.
