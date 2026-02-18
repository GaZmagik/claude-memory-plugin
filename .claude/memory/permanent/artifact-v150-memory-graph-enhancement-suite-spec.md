---
id: artifact-v150-memory-graph-enhancement-suite-spec
title: v1.5.0 Memory Graph Enhancement Suite Spec
type: artifact
scope: project
created: "2026-02-18T09:36:44.527Z"
updated: "2026-02-18T09:36:44.527Z"
tags:
  - v1.5.0
  - spec
  - ready-for-planning
  - memory-graph
  - project
---

Spec created for feature/004-v1.5.0-memory-graph-enhancements. Four features: (1) similarity field on GraphEdge (P1); (2) update-edge command with --similarity/--relation/--verify/--apply flags (P2); (3) check-relevance command with multi-factor scoring and --auto-move --confirm guard (P3); (4) suggest-links --llm-type LLM verification storing verifiedRelation staging field (P4). Key decisions: similarity clamped 0-1 at write boundary; NaN/Infinity rejected; llmConfidence NOT stored; --auto-move requires --confirm; verifiedRelation removed cleanly on --apply. Spec at .specify/specs/feature/004-v1.5.0-memory-graph-enhancements/spec.md. Checklist PASSED. Ready for /speckit:plan.
