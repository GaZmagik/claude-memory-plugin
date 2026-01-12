---
id: artifact-cli-phase-plan
title: 6-Phase CLI Implementation Plan for Memory Skill
type: permanent
scope: project
tags: [artifact, plan, cli, phases]
created: 2026-01-12T15:48:00Z
updated: 2026-01-12T15:48:00Z
---

# Artifact: 6-Phase CLI Implementation Plan

## Overview

TypeScript CLI for memory skill achieving full shell parity (36+ commands).

## Phases

### Phase 1: CLI Foundation (STARTED)
**Goal**: Wire existing functions to CLI interface

**Files created**:
- `src/cli.ts` - Entry point with shebang ✓
- `src/cli/index.ts` - Dispatcher with command routing ✓
- `src/cli/parser.ts` - Argument parsing utilities ✓
- `src/cli/response.ts` - JSON response formatting ✓
- `src/cli/help.ts` - Help text generation ✓
- `src/cli/commands/crud.ts` - write, read, list, delete, search, semantic ✓
- `src/cli/commands/tags.ts` - tag, untag
- `src/cli/commands/graph.ts` - link, unlink, edges, graph, mermaid, remove-node ✓
- `src/cli/commands/quality.ts` - health, validate, quality, audit, audit-quick (stubs) ✓
- `src/cli/commands/maintenance.ts` - sync, repair, rebuild, reindex, prune, sync-frontmatter
- `src/cli/commands/utility.ts` - rename, move, promote, archive, status
- `src/cli/commands/bulk.ts` - bulk-link, bulk-delete, export, import ✓
- `src/cli/commands/suggest.ts` - suggest-links, summarize
- `src/cli/commands/query.ts` - query, stats, impact
- `src/cli/commands/think.ts` - think subcommands ✓

**Commands wired**: 18/36

### Phase 2: Simple Maintenance Commands
- `src/maintenance/status.ts` - System status
- `src/maintenance/prune.ts` - Remove expired temporaries
- Graph edges/remove-node (extend existing)

**Commands**: 4 new

### Phase 3: Complex Maintenance Commands
- `src/maintenance/validate.ts` - Detailed validation
- `src/maintenance/sync.ts` - Reconcile graph/index/disk
- `src/maintenance/repair.ts` - sync + validate
- `src/maintenance/sync-frontmatter.ts` - Bulk YAML sync

**Commands**: 4 new

### Phase 4: Utility Commands
- `src/maintenance/rename.ts` - Rename with reference updates
- `src/maintenance/move.ts` - Move between scopes
- `src/maintenance/promote.ts` - Type conversion
- `src/maintenance/archive.ts` - Archive a memory
- `src/query/query.ts`, `stats.ts`, `impact.ts` - Complex filtering

**Commands**: 8 new

### Phase 5: Quality Commands
- `src/quality/quality.ts` - 3-tier quality assessment
- `src/quality/audit.ts` - Bulk quality scanning

**Commands**: 3 new (quality, audit, audit-quick)

### Phase 6: Suggestion Commands
- `src/suggest/suggest-links.ts` - Semantic link discovery
- `src/suggest/summarize.ts` - Summary rollups

**Commands**: 2 new

## Key Patterns

1. **Scope resolution**: Every handler uses `getResolvedScopePath(scope)` helper
2. **Error handling**: All handlers return `CliResponse` with status/message/data
3. **CLI parsing**: Flags parsed consistently across all commands
4. **Command delegation**: Handlers call library functions, don't duplicate logic
