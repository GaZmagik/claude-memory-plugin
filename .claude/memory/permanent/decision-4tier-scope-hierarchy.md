---
id: decision-4tier-scope-hierarchy
title: 4-Tier Scope Hierarchy for Memory Storage
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-10T19:59:00Z"
updated: "2026-01-12T22:02:47.194Z"
tags:
  - architecture
  - scope-resolution
  - phase-2
links:
  - learning-gitignore-comment-formatting-two-phase-fix
  - learning-scope-field-frontmatter-serialisation-gotcha
  - learning-scope-field-frontmatter-serialisation-gotcha-two
  - learning-scope-isolation-architecture-design
  - learning-tdd-scope-resolution-module-structure
---

# Decision: 4-Tier Scope Hierarchy

## Context
Claude Code Memory Plugin needs to support memories at multiple organizational levels (org, project, personal local, global personal) with clear precedence and isolation.

## Decision
Implemented 4-tier scope hierarchy: **enterprise > local > project > global**

Each scope has:
- Separate directory (.claude/memory/local/, .claude/memory/, ~/.claude/memory/, managed-settings path)
- Separate index.json and graph.json
- Scope parameter in all CRUD operations
- Local scope automatically added to .gitignore for privacy

## Consequences
**Positive:**
- Users can store org-wide gotchas (enterprise)
- Personal project learnings (local/project) stay private
- Cross-project tips (global) shared across projects
- Clear ownership and visibility boundaries

**Trade-offs:**
- Scope resolution logic becomes critical
- Must handle missing scopes gracefully
- Storage complexity increases (manage 4 indexes instead of 1)
- List/search operations must merge results across scopes
