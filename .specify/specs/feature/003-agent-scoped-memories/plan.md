# Implementation Plan: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Branch**: feature/003-agent-scoped-memories
**Created**: 2026-02-01
**Status**: Draft (Awaiting Approval)

---

## Technical Context

**Technology Stack**:
- TypeScript (existing codebase)
- Bun runtime and test framework
- Node.js filesystem APIs
- Existing memory system architecture

**Architecture**: Extension of existing scope resolution system to support agent-scoped memory namespaces

**Dependencies**:
- skills/memory/src/scope/resolver.ts - Scope resolution logic
- skills/memory/src/types/enums.ts - Scope enum definition
- skills/memory/src/cli/parser.ts - CLI argument parsing
- skills/memory/src/graph/ - Graph storage and operations
- skills/memory/src/core/ - Index and frontmatter systems

**Key Design Decisions**:
1. **Agent scope is opt-in** - Requires explicit `--agent <name>` flag
2. **Reuse existing infrastructure** - No new storage formats, identical to project scope structure
3. **Scope metadata in edges** - Cross-scope links track source and target scope for proper cleanup
4. **Agent identity in frontmatter** - Optional `agent` field for discoverability and validation

---

## Constitution Check

| Article | Status | Notes |
|---------|--------|-------|
| **P1: Plugin Architecture** | ✅ Pass | No changes to plugin structure |
| **P2: Test-First Development** | ✅ Pass | TDD enforced throughout all phases |
| **P3: GitHub Flow** | ✅ Pass | Feature branch workflow |
| **P4: Observability** | ✅ Pass | Logging and error messages include agent context |
| **P5: Simplicity & YAGNI** | ✅ Pass | Solves concrete documented use cases, minimal complexity |
| **P6: Semantic Versioning** | ✅ Pass | New feature, backward compatible → v1.3.0 |

**Complexity Justification**:
- **Agent scope hierarchy**: Required to support agent-project and agent-global scopes with proper fallback behaviour
- **Cross-scope linking**: Essential for agents to reference shared project knowledge and maintain bidirectional relationships
- **Scope metadata in edges**: Necessary for proper cleanup when memories are deleted across scope boundaries

**No constitutional violations detected.**

---

## Phase 0: Research

See [research.md](./research.md) for full research findings.

**Key Decisions**:

1. **Scope Extension Strategy**: Extend existing `Scope` enum with `AgentProject` and `AgentGlobal` values
   - **Rationale**: Maintains consistency with existing 4-tier hierarchy (enterprise → local → project → global), simply adds agent variants
   - **Alternative considered**: Separate agent scope system → Rejected due to duplication and complexity

2. **Storage Structure**: Mirror project scope structure under `.claude/memory/agents/{agent-name}/`
   - **Rationale**: Reuses all existing infrastructure (index.json, graph.json, embeddings.json, permanent/ directory)
   - **Alternative considered**: Flat structure with agent prefix in filenames → Rejected due to poor discoverability

3. **Agent Name Sanitisation**: Lowercase alphanumeric and hyphens only
   - **Rationale**: Filesystem-safe, consistent with existing slug generation for memory IDs
   - **Alternative considered**: Allow any Unicode → Rejected due to filesystem compatibility issues

4. **Cross-Scope Link Storage**: Bidirectional storage with scope metadata
   - **Rationale**: Enables proper cleanup and impact analysis across scope boundaries
   - **Alternative considered**: Links only in source scope → Rejected due to orphan detection issues

5. **Default Scope for Agent Operations**: Agent-project when in git repo, agent-global otherwise
   - **Rationale**: Mirrors existing project/global default behaviour, git-tracked agent knowledge is shareable
   - **Alternative considered**: Always agent-global → Rejected as it prevents team collaboration on agent knowledge

---

## Phase 1: Design

**Artifacts Generated**:
- [data-model.md](./data-model.md) - Entity definitions and relationships
- [contracts/](./contracts/) - API specifications for modified commands
- [quickstart.md](./quickstart.md) - Developer validation scenarios

**Architecture Overview**:

```
Agent Scope Hierarchy:
  agent-project (.claude/memory/agents/{name}/)
    ↓ fallback
  agent-global (~/.claude/memory/agents/{name}/)
    ↓ --include-shared flag
  project (.claude/memory/)
    ↓
  global (~/.claude/memory/)
```

**Storage Layout**:
```
.claude/memory/agents/
├── typescript-expert/
│   ├── permanent/
│   │   ├── learning-esm-imports.md
│   │   └── gotcha-type-only-imports.md
│   ├── temporary/
│   ├── graph.json
│   ├── index.json
│   └── embeddings.json
└── rust-expert/
    ├── permanent/
    ├── graph.json
    └── ...
```

**Cross-Scope Link Example**:
```json
{
  "source": "decision-use-typescript",
  "target": "agent:typescript-expert:learning-esm-imports",
  "label": "informs",
  "sourceScope": "project",
  "targetScope": "agent-project",
  "targetAgent": "typescript-expert"
}
```

---

## Phase 2: Implementation Outline

### Phase A: Foundation (Scope System Extension)
**Goal**: Extend scope system to recognise and resolve agent scopes

**Key Work**:
- Add `AgentProject` and `AgentGlobal` to `Scope` enum
- Extend `ScopeResolver` to accept optional `agent` parameter
- Implement agent name sanitisation utility
- Add agent scope path resolution logic
- Update `getDefaultScope()` for agent context

**Test Coverage**:
- Scope enum includes new values
- Agent name sanitisation handles edge cases (spaces, special chars, Unicode)
- Path resolution returns correct directories for agent scopes
- Default scope selection works with and without agent context

---

### Phase B: Storage Infrastructure
**Goal**: Enable reading and writing agent-scoped memories

**Key Work**:
- Extend frontmatter schema with optional `agent` field
- Update index system to handle agent scope directories
- Modify write operations to create agent directories on first use
- Update read operations to resolve agent scope paths
- Extend search operations to filter by agent scope

**Test Coverage**:
- Agent memories written to correct directories
- Agent directories auto-created with proper structure
- Index includes agent metadata
- Frontmatter serialisation preserves agent field
- Search scoped to agent namespace

---

### Phase C: CLI Integration
**Goal**: All memory commands accept `--agent` flag

**Key Work**:
- Add `--agent` flag to CLI parser
- Pass agent context through command pipeline
- Update help text for all commands
- Implement `memory agents` command to list all agents
- Add `--all-agents` flag for cross-agent search
- Update error messages to include agent context

**Test Coverage**:
- Parser extracts `--agent` value correctly
- All CRUD commands work with `--agent` flag
- Commands without `--agent` behave identically to pre-feature
- Help text documents agent flags
- Error messages include agent name when applicable

---

### Phase D: Cross-Scope Graph Operations
**Goal**: Support linking memories across scope boundaries

**Key Work**:
- Extend `GraphEdge` interface with scope metadata fields
- Implement cross-scope link creation (bidirectional storage)
- Update edge deletion to clean up both scopes
- Modify impact analysis to traverse scope boundaries
- Add scope indicators to `memory edges` output
- Update graph validation to check cross-scope integrity

**Test Coverage**:
- Cross-scope links stored in both graph files
- Scope metadata persists and deserialises correctly
- Deleting a memory cleans up links in all scopes
- Impact analysis includes cross-scope memories
- Orphan detection works across scopes
- Scope indicators appear in CLI output

---

### Phase E: Advanced Features
**Goal**: Graph visualisation, agent listing, and quality checks

**Key Work**:
- Add agent-specific Mermaid diagram generation
- Implement visual distinction for agent nodes
- Create `memory agents` command with memory counts
- Extend health checks to validate agent scopes
- Add agent filtering to stats commands
- Implement `--include-shared` flag for merged results

**Test Coverage**:
- Mermaid diagrams show agent and shared memories
- Agent nodes visually distinct from project nodes
- `memory agents` lists all agents with counts
- Health checks detect agent-scope issues
- Stats commands report agent-specific metrics
- Merged results respect scope hierarchy

---

### Phase F: Context Injection (Future Extension Point)
**Goal**: Prepare infrastructure for automatic agent context injection

**Note**: Full auto-injection deferred to future feature (requires agent identification system). This phase lays the groundwork.

**Key Work**:
- Document agent identity detection options in research.md
- Add placeholder for agent context parameter in hooks
- Design agent invocation marker format
- Document hook integration requirements

**Test Coverage**:
- Agent context parameter exists in hook interfaces (no-op for now)
- Documentation complete for future implementers

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Cross-scope link corruption** | High | Medium | Bidirectional storage with validation, comprehensive integration tests for edge deletion |
| **Agent name collisions** | Medium | Low | Sanitisation function, document naming conventions, add validation in `memory write` |
| **Performance degradation with many agents** | Medium | Low | Reuse existing index caching, agent operations O(1) lookup, monitor performance in integration tests |
| **Breaking existing memory operations** | High | Low | Strict backward compatibility tests, no `--agent` flag = unchanged behaviour, feature branch testing |
| **Graph.json merge conflicts** | Medium | Medium | Same as existing project scope, mitigated by agent-scoped graphs reducing contention |
| **Scope indicator ambiguity** | Low | Low | Clear naming: `[agent-project]`, `[agent:typescript-expert]`, document in formatters |

---

## Implementation Strategy

### TDD Workflow

Following P2 (Test-First Development), each phase follows strict Red-Green-Refactor:

1. **Red Phase**: Write all tests for the phase FIRST
   - Unit tests for new functions
   - Integration tests for cross-component behaviour
   - See tests fail with meaningful error messages

2. **Green Phase**: Implement minimum code to pass tests
   - No refactoring during this phase
   - Focus on making tests pass

3. **Refactor Phase**: Clean up implementation
   - Extract common patterns
   - Improve naming and structure
   - Tests remain green throughout

### Phase Sequencing

**Strict Dependencies**:
- Phase B depends on Phase A (need scope resolution before storage)
- Phase C depends on Phase B (need storage before CLI)
- Phase D depends on Phase B and C (need storage and CLI before cross-scope links)
- Phase E depends on Phase D (need cross-scope links before visualisation)
- Phase F is independent (documentation only)

**Approval Gates**:
- After Phase A: Review scope system changes
- After Phase C: Review CLI integration
- After Phase D: Review cross-scope linking (highest risk area)
- Final review before merge

---

## Testing Strategy

### Test Levels

**Unit Tests** (skills/memory/src/\*\*/\*.spec.ts):
- Scope resolution with agent context
- Agent name sanitisation
- Frontmatter with agent field
- Cross-scope edge metadata

**Integration Tests** (tests/integration/agent-scoped-memories.spec.ts):
- Full workflow: write → read → search → delete
- Cross-scope linking end-to-end
- Multi-scope search with `--include-shared`
- Agent directory auto-creation

**Property-Based Tests** (where applicable):
- Agent name sanitisation (fuzz testing)
- Scope hierarchy ordering
- Cross-scope link bidirectionality

### Backward Compatibility Tests

Critical: Ensure zero breaking changes for existing users

- All existing commands work without `--agent` flag
- Existing memory files remain readable
- Scope hierarchy unchanged for non-agent operations
- Graph operations handle pre-feature graphs gracefully

### Coverage Targets

- Line coverage: >95% (existing standard)
- Branch coverage: >90%
- Critical paths: 100% (scope resolution, cross-scope deletion)

---

## Acceptance Criteria

This plan is approved when:

1. ✅ All technical decisions documented with rationale
2. ✅ Constitution check complete (no violations)
3. ✅ Data model defines all entities and relationships
4. ✅ API contracts specify request/response formats
5. ✅ Quickstart guide provides validation scenarios
6. ✅ Risks identified with mitigation strategies
7. ✅ Implementation phases sequenced with dependencies
8. ✅ Testing strategy covers unit, integration, and backward compatibility
9. ✅ Approval gates defined for high-risk areas

---

## Next Steps

After plan approval:

1. Generate task list with `/speckit:tasks`
2. Begin Phase A (Foundation) following TDD workflow
3. Run `/speckit:review` after each phase completion
4. Request approval at each gate before proceeding
5. Merge to main after final approval and all tests passing

---

**Plan Version**: 1.0.0
**Last Updated**: 2026-02-01
