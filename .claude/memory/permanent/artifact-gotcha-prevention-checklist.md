---
id: artifact-gotcha-prevention-checklist
title: Gotcha Prevention Checklist
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-01-13T08:04:02.007Z"
updated: "2026-01-13T22:47:30.203Z"
tags:
  - gotcha
  - checklist
  - prevention
  - hub
  - project
---

# Gotcha Prevention Checklist

Central hub for documented gotchas and their prevention strategies.

## Critical Gotchas

### Mock Global Pollution
- **Issue**: vi.mock affects all tests in file if not properly isolated
- **Prevention**: Use process isolation, fresh mocks per test
- **See**: `gotcha-vi-mock-global-pollution`

### Bulk Move Loses Graph Edges
- **Issue**: Cross-scope edges do not survive bulk move operations
- **Prevention**: Re-link after cross-scope moves, verify edge integrity
- **See**: `gotcha-bulk-move-loses-graph-edges-design-cross-scope-edges-dont-survive`

### Agent Copies vs Rewrites
- **Issue**: Agents should copy context, not rewrite entire approach
- **Prevention**: Explicit instructions to preserve existing patterns
- **See**: `gotcha-agents-should-be-copies-not-rewrites`

## Pre-Work Checks

- [ ] Before mocking: Check isolation strategy
- [ ] Before bulk ops: Verify edge preservation
- [ ] Before agent tasks: Specify copy vs rewrite intent

## How to Use

Run `/memory:check-gotchas` before starting significant work to surface relevant warnings.
