---
type: learning
title: Think scope - Project vs Local split
topic: Think document scoping architecture
created: 2026-01-12T10:45:00.000Z
updated: 2026-01-12T10:45:00.000Z
tags: [think, scope, architecture, feature-001, typescript]
severity: medium
---

Think documents support both Project scope (visible to team) and Local scope (gitignored, private).

Enables scoped deliberations: team discussions in Project scope (tracked in git), personal thinking in Local scope (gitignored). This is an improvement over the bash implementation which only supported single scope.

Implementation uses `Scope.Project` and `Scope.Local` with separate temporary directories per scope. State file `.think-current` tracks current document with scope context.
