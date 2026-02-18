---
id: decision-v150-implementation-sequence
title: "v1.5.0 Implementation Sequence: Similarity → Update-Edge → Check-Relevance → LLM"
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-17T08:02:01.211Z"
updated: "2026-02-17T08:02:05.315Z"
tags:
  - v1.5.0
  - project-planning
  - risk-management
  - project
---

Implement in order: (1) similarity on edges (minimal risk, one-line type ext), (2) update-edge command (refactors link.ts but enables later features), (3) check-relevance (independent, large surface but self-contained), (4) LLM verification (experimental, depends on Ollama availability). Sequence minimises blocking: early features provide infrastructure for later ones without requiring Ollama setup or risky refactors upfront.
