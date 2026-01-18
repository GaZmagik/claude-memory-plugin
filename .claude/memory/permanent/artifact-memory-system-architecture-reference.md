---
id: artifact-memory-system-architecture-reference
title: Memory System Architecture Reference
type: artifact
scope: project
created: "2026-01-18T11:31:30.029Z"
updated: "2026-01-18T11:31:30.029Z"
tags:
  - architecture
  - memory
  - reference
  - hub
  - project
links:
  - decision-session-continuity-strategy
---

# Memory System Architecture Reference

Comprehensive reference for the claude-memory-plugin architecture.

## Scope Hierarchy (4-Tier)

Precedence: Enterprise > Local > Project > Global (earlier scopes override later ones)

## Key Subsystems

- Scope Resolution
- Context Hooks
- Post-Compaction restoration
- Graph Operations
