---
id: decision-feature-005-planning-rule-and-reminder-graph-nodes-architecture-design
title: "Feature 005 Planning: Rule and Reminder Graph Nodes - Architecture Design"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-19T04:30:35.646Z"
updated: "2026-02-19T06:33:18.673Z"
tags:
  - promoted-from-think
  - project
---

# Feature 005 Planning: Rule and Reminder Graph Nodes - Architecture Design

IMPLEMENTATION PLAN STRUCTURE:

Phase 0 - Type System Foundation (PRIORITY: P0 - Blocking)
- Add MemoryType.Rule and MemoryType.Reminder to enums.ts
- Add EdgeType.GovernedBy and EdgeType.RemindedBy to enums.ts
- Extend IndexEntry with externalFileKind? and externalPath?
- Add parseMemoryType cases for new types
- Update Mermaid NODE_SHAPES and NODE_STYLES

Phase 1 - External Module Core (PRIORITY: P1 - Critical path)
- Create external/ directory structure
- Implement external-file-types.ts (ExternalFileEntry, ExternalFileKind enum)
- Implement external-file-discovery.ts (rule discovery, reminder discovery, ID generation)
- Implement external-file-indexer.ts (upsert to graph/index/embeddings)
- Full TDD coverage for all modules

Phase 2 - Integration & Guards (PRIORITY: P1 - Critical path)
- Extend syncMemories() in maintenance/sync.ts
- Add read-only guards to cmdWrite, cmdDelete, cmdRename, cmdMove, cmdPromote
- Update cmdRead to handle externalPath
- Add memory index-context command to CLI

Phase 3 - Quality Exclusions (PRIORITY: P2 - Important but not blocking)
- Modify quality/assess.ts to auto-exclude rule/reminder nodes
- Update audit command to skip external nodes

Phase 4 - Documentation & Validation (PRIORITY: P2)
- Update README with external file indexing behaviour
- Document ID generation scheme
- Add integration tests for full discovery → search workflow

RISKS:
1. Directory tree walking performance on deep hierarchies → Mitigation: Vendor filtering, early termination at home
2. Symlink loops → Mitigation: Track visited canonical paths
3. Race condition if CLAUDE.md modified during sync → Mitigation: Content hash detects staleness

_Deliberation: `thought-20260219-042927105`_
