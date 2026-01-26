---
id: decision-v110-feature-exploration-hint-visibility-auto-flag-enhanced-injection
title: v1.1.0 Feature Exploration - Hint visibility, --auto flag, enhanced injection
type: decision
scope: project
created: "2026-01-24T20:12:49.876Z"
updated: "2026-01-24T20:12:49.876Z"
tags:
  - promoted-from-think
  - project
---

# v1.1.0 Feature Exploration - Hint visibility, --auto flag, enhanced injection

After thorough exploration of v1.1.0 features with architectural, security, and pragmatic perspectives, here's the synthesis:

**Feature 1: Enhanced Hint Visibility**
- Implement stderr hints with progressive disclosure (first N uses)
- Add --non-interactive flag to preserve pipeline composability
- Keep interactive prompts optional, triggered only for complex/ambiguous thoughts
- Improve --help with concrete examples

**Feature 2: --auto Flag with Ollama**
- Build intelligent agent/style selector using Ollama generate()
- Implement transparency (show selection + reasoning) and confirmation gate
- Add security safeguards: sanitise inputs, validate selections against discovery results, implement timeouts
- Graceful degradation when Ollama unavailable
- Respect --non-interactive mode

**Feature 3: Enhanced Memory Injection**
- Start conservative: keep default behaviour (gotchas only)
- Add configurable injection via memory.local.md for decisions/learnings (opt-in)
- Use single semantic search with client-side type filtering (performance)
- Implement lazy loading: gotchas first, then decisions/learnings if relevant
- Maintain per-type session caching to prevent duplicate injections

**Key Trade-offs Accepted:**
1. Interactive features need --non-interactive flag for pipeline use
2. Security over convenience (validation, timeouts, confirmation gates)
3. Conservative defaults with opt-in for advanced features
4. Performance via caching over real-time accuracy

**Implementation Priority:**
Phase 1: Hint visibility (lowest risk, highest immediate value)
Phase 2: Enhanced injection (builds on existing patterns)
Phase 3: --auto flag (most complex, needs security hardening)

This approach balances innovation with stability, respects existing architectural patterns (library-first, graceful degradation), and provides user control through configuration.

_Deliberation: `thought-20260124-200933625`_
