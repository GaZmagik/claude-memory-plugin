---
id: decision-accord-plugin-autonomous-agent-orchestration-platform-with-persistent-memory-and-dashboard
title: Accord Plugin - Autonomous agent orchestration platform with persistent memory and dashboard
type: decision
scope: project
created: "2026-01-30T18:01:35.449Z"
updated: "2026-01-30T18:01:35.449Z"
tags:
  - promoted-from-think
  - project
---

# Accord Plugin - Autonomous agent orchestration platform with persistent memory and dashboard

Multi-agent architectural deliberation on Accord plugin has converged on several key insights:

**Architecture Consensus:**
- Daemon + plugin hybrid (NOT pure plugin) - daemon handles scheduling/execution, plugin provides control plane
- Memory plugin as canonical state store for agent deliberations/decisions (NOT shadow .state.json files)
- Agent working memory (execution history, budgets, schedules) in separate state files
- Message queue-based IPC between daemon and Claude Code sessions (survives crashes)
- Decision checkpoint model for transparency and observability

**Critical Implementation Requirements:**
- Graceful shutdown with append-only transaction logs (survive crashes)
- Process-level token budget monitoring across all agents
- Agent config versioning (prevent mid-execution reconfiguration)
- Centralized agent registry (single source of truth, avoid orphaned resources)
- Structured termination events (success, budget-exceeded, timeout, crash)

**Developer Experience Priorities:**
- Instrumented documentation (executable examples, not hypothetical)
- Symptom-first troubleshooting guides
- Request-response traces for API documentation
- Document failure modes explicitly and early (build trust through transparency)
- Observe-then-configure onboarding flow

**Key Architectural Risks Identified:**
- Configuration fragmentation (4 places to configure agents)
- Multi-file transactions without transactional semantics (orphaned state)
- Temporal coupling (agent running with old config during reconfiguration)
- State file locking (concurrent writes during parallel meetings)

**Next Steps:**
1. Decide: Build Accord as separate project or defer to focus on memory plugin v1.2.0+
2. If proceeding: Start with manual /meeting skill (MVP) before scheduled meetings
3. Prototype centralized agent registry with JSON-schema validation
4. Design state file format (append-only, version-stamped, crash-safe)

This deliberation has validated the feasibility of Accord while surfacing critical architectural challenges that must be addressed before implementation.

_Deliberation: `thought-20260130-171533471`_
