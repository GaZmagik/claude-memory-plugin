---
id: decision-memory-hook-enhancement-plan-review
title: Memory Hook Enhancement Plan Review
type: decision
scope: project
created: "2026-01-15T19:44:49.357Z"
updated: "2026-01-15T19:44:49.357Z"
tags:
  - promoted-from-think
  - project
---

# Memory Hook Enhancement Plan Review

## Conclusion

REFINED PLAN: (1) Phase 1 - Retrospective log reading in session-restore, include link suggestions from memory-commit output in retrospective context. (2) Phase 2 - PreCompact sync only (essential for data integrity), with clear error handling: log and continue, never block compaction. (3) Defer suggest-links hook entirely - surface suggestions in retrospective instead. (4) Defer archive/cleanup - prune already handles expiry. (5) Keep start-memory-index.ts focused - add think list display but NOT health checks there. (6) Add simple .last-commit-status file for memory-capture feedback. (7) Document error handling semantics for all hooks: log failures, never block critical operations.

## Deliberation Trail

_Promoted from think document: `thought-20260115-194159327`_

### Thought

Phase 1 (Retrospective Integration) is HIGH VALUE. Reading the existing log directly avoids agent spawn overhead. The log already contains session summary, what worked/failed, and memory IDs captured. This is the most impactful change with lowest effort.

### Counter-argument

POTENTIAL OVERKILL: PostToolUse suggest-links hook. Running suggest-links after every memory write adds latency. Embeddings computation is expensive. Better as a manual command or periodic batch job rather than automatic hook. Risk of noise - too many suggestions irritates users.

### Counter-argument

POTENTIAL OVERKILL: retrospective-parser command. If we're just grepping the log in session-restore, a separate command adds unnecessary abstraction. Keep it inline unless parsing becomes complex.

### Thought

MISSING: No hook for memory-commit success/failure notification. When PreCompact spawns background memory-capture, there's no feedback on whether it succeeded. Should log result or create a status file that session-restore can check.

### Thought

MISSING: Think document expiry handling. Plan mentions archiving old thinking docs but doesn't address what happens to thinking docs that were never concluded. Should they auto-expire after N days? Should session-restore surface them as 'abandoned deliberations'?

### Alternative

ALTERNATIVE for suggest-links: Instead of PostToolUse hook, add suggest-links to memory-commit command itself. When committing memories, automatically check for link suggestions and include them in the commit output. User reviews during commit, not after every write.

### Thought

GOOD: PreCompact sync is essential. Currently memory-capture can spawn before index/graph are consistent. Running sync first ensures the spawned session sees accurate state. Low overhead, high value.

### Counter-argument

CONCERN: Four new hook files in Phase 2 is ambitious. Each needs tests, registration, error handling. Risk of scope creep. Consider implementing incrementally: start with sync (pre-compact) and health-check (session-start), defer suggest-links and archive to later iteration.

### Thought

PRIORITY REFINEMENT: (1) Retrospective log reading - immediate value, low effort. (2) PreCompact sync - data integrity, essential. (3) SessionStart health+think list - user awareness. (4) Archive/cleanup - defer, already have prune. (5) suggest-links - defer, move to memory-commit instead of hook.

### Thought

SIMPLIFICATION: Phase 3 'enhance existing hooks' can be merged into Phase 2. Don't create separate memory-health-check.ts - add health check to existing start-memory-index.ts. One file, one responsibility.

### Thought (model:haiku [68c3aa37-f03f-4ae2-9db3-ccf0865fb996])

The scope creep concern is absolutely valid—four hook files is ambitious, but the priority refinement nails the right sequencing. However, I'd push back slightly on deferring suggest-links entirely. Instead of moving it to memory-commit (which adds latency to a user-facing command), consider this: make suggest-links opt-in via a config flag that defaults to disabled. Phase 2 implements the hook infrastructure, but users don't pay the embedding cost unless they explicitly enable it. This gives you the capability without forcing the overhead.

### Counter-argument (model:claude-sonnet-4-5-20250929 [8ff50dfc-7484-47f3-b786-31883650dbb0])

The opt-in config flag sounds elegant but creates a configuration landmine. Users won't discover the feature exists because it's hidden behind a default-off flag. And who's maintaining that flag's documentation? It's already unclear where memory config lives (is it .claude/memory/config.json? Environment variables? Per-project?). Adding another toggle increases surface area without solving the core problem: embeddings computation is slow regardless of when it runs.

### Thought

REFINED PLAN: (1) Phase 1 - Retrospective log reading in session-restore, include link suggestions from memory-commit output in retrospective context. (2) Phase 2 - PreCompact sync only (essential for data integrity), with clear error handling: log and continue, never block compaction. (3) Defer suggest-links hook entirely - surface suggestions in retrospective instead. (4) Defer archive/cleanup - prune already handles expiry. (5) Keep start-memory-index.ts focused - add think list display but NOT health checks there. (6) Add simple .last-commit-status file for memory-capture feedback. (7) Document error handling semantics for all hooks: log failures, never block critical operations.

