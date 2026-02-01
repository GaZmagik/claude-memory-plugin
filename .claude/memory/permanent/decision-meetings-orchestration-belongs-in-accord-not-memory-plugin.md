---
id: decision-meetings-orchestration-belongs-in-accord-not-memory-plugin
title: Meetings are Accord's responsibility, not memory plugin's
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-01T20:00:27.419Z"
updated: "2026-02-01T22:38:06.372Z"
tags:
  - architecture
  - separation-of-concerns
  - accord
  - v1.3.0
  - project
---

## Decision

Meeting orchestration belongs in the Accord plugin, not the memory plugin.

## Rationale

**Accord** = Orchestration & coordination (meetings, agents, projects)
**Memory Plugin** = Knowledge graph & persistence (decisions, learnings, artifacts)

Meetings are fundamentally an **agent coordination concern**, not a knowledge storage concern.

## Implementation

- Meetings stored in: `.claude/accord/meetings/`
- Meeting outputs (decisions/learnings) promoted to: `.claude/memory/permanent/`
- Integration: Accord invokes `memory write` to save promoted outputs with `meeting_source: meeting-{id}` in frontmatter

## Benefits

1. **Independence**: Accord v1.0.0 ships without depending on memory plugin v1.3.0
2. **Clear ownership**: Meeting orchestration = Accord, knowledge graph = Memory
3. **Simpler scope**: Each plugin focuses on its core responsibility
4. **Faster iteration**: No version coupling between plugins

## Impact on Memory Plugin v1.3.0

- Removed meeting command from scope
- v1.3.0 now focuses purely on agent-scoped memories
- Cleaner, more focused feature set
