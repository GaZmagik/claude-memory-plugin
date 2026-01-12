---
id: artifact-typescript-cli-testing-infrastructure-first-approach
title: TypeScript CLI Testing - Infrastructure-First Approach
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-01-12T18:01:16.436Z"
updated: "2026-01-12T22:02:47.192Z"
tags:
  - typescript
  - testing
  - cli
  - vitest
  - project
---

# TypeScript CLI Testing Strategy

## File Structure
- `cli/parser.spec.ts` - Arg parsing (22 tests)
- `cli/response.spec.ts` - Response formatting (18 tests)
- `cli/help.spec.ts` - Help text validation (14 tests)
- `cli/index.spec.ts` - Dispatcher routing (27 tests)
- `cli/commands/crud.spec.ts` - CRUD handlers (22 tests)
- `cli/commands/graph.spec.ts` - Graph handlers (22 tests)
- `cli/commands/tags.spec.ts` - Tag handlers (8 tests)
- `cli/commands/quality.spec.ts` - Quality handlers (13 tests)
- `cli/commands/maintenance.spec.ts` - Maintenance handlers (19 tests)
- `cli/commands/bulk.spec.ts` - Bulk handlers (20 tests)

## Pattern
Infrastructure tests first (parser, response, help, dispatch) provide foundation. Command handler tests mock core library functions and verify arg parsing/validation logic. Total: 141+ tests covering 27 CLI files.

## Key Principle
Test dispatcher's routing logic independently of handlers. Test handler's argument parsing logic by mocking its dependencies (core functions).
