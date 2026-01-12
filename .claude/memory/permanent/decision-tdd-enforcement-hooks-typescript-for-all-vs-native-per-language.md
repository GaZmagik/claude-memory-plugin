---
type: decision
title: "TDD enforcement hooks: TypeScript-for-all vs native per-language"
created: "2026-01-12T20:31:30.192Z"
updated: "2026-01-12T20:31:30.192Z"
tags:
  - tdd
  - architecture
  - hooks
  - typescript
  - project
scope: project
---

# Decision: TypeScript-for-all for TDD Hooks

## Rationale

After extensive deliberation with 15+ perspectives (architect, pragmatist, rust expert, python expert, test quality expert, performance expert, security auditor, simplifier, risk assessor, code quality expert, node.js expert, documentation expert, user advocate, product manager, mentor), the decision is to implement all TDD enforcement hooks in TypeScript/Bun rather than native per-language.

## Key Findings

**TypeScript advantages:**
- Single test suite (vitest) - avoids pytest + cargo test + vitest fragmentation
- Bun startup: ~10ms vs Python ~150ms - critical for pre-tool-use hooks running 50+ times per session
- Shared utilities (subprocess, .tddignore parsing, project root detection) - no reimplementation
- Unified error handling and logging
- Reduced supply chain risk (one runtime to audit vs N language ecosystems)

**Native language tradeoffs:**
- Better AST access (Python pytest hooks, Rust AST analysis) but subprocess interface exists
- Idiomatic code but maintenance burden on language experts
- Contributor barrier - Python-only devs can't modify hooks

## Languages to Support (Priority Order)

1. TypeScript/JavaScript ✅ (done)
2. Python ✅ (done)
3. Rust (popular systems language)
4. Go (popular backend, simple test output format)
5. Ruby (Rails ecosystems)

Defer: Java, C# (complex build systems, demand-driven)

## Extensibility

Design for optional native analysis plugins via subprocess if needed later (YAGNI now, but don't close door). Start with TypeScript-for-all, measure gaps, iterate.
