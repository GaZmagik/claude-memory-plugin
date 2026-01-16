---
id: retro-parallel-expert-review-effective
title: "Retrospective: Parallel Expert Review Orchestration"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-16"
updated: "2026-01-16T13:52:25.791Z"
tags:
  - retrospective
  - process
  - code-review
  - orchestration
  - agents
severity: medium
---

# Retrospective: Parallel Expert Review Orchestration

## What Happened

This session used a `/speckit.review` command that spawned 7 specialist agents in parallel:
- code-quality-expert (Opus)
- security-code-expert (Opus)
- performance-optimisation-expert (Sonnet)
- test-quality-expert (Sonnet)
- documentation-accuracy-expert (Haiku)
- typescript-expert (Sonnet)
- nodejs-expert (Sonnet)

All 7 agents ran **simultaneously** with separate context budgets, completing in ~19 minutes wall-clock time.

## Why This Worked

**Efficiency gains:**
- Sequential equivalent would be ~90+ minutes (7 agents × 10-15 min each)
- Parallel reduced to 19 minutes (bottleneck = slowest agent, not sum)
- No coordination overhead - agents run independently
- Each agent has separate context window - no starvation

**Quality benefits:**
- 7 different perspectives caught 1 critical (security), 8 major, 11 minor issues
- Diversity prevented blind spots (security expert found shell injection no one else caught)
- Each agent focused on their expertise (TypeScript expert found 97 errors, others didn't)

**Cost reasonable:**
- Main session retained context throughout
- No blocking - agents completed while main session continued analysis
- Results integrated back immediately

## Key Insight

For comprehensive code review with multiple dimensions (security, performance, types, tests, docs), parallel orchestration is vastly superior to sequential review. The bottleneck is the slowest dimension, not the sum of all dimensions.

## When to Use

- **Feature shipping reviews**: Catch issues across all dimensions before release
- **Major refactorings**: Verify safety, performance, and correctness simultaneously  
- **Code audits**: Comprehensive assessment by specialists

## When Not to Use

- **Quick validation**: Overkill for small changes
- **Blocking scenarios**: If you need result synchronously before proceeding
- **Exploration phase**: Too formal for early-stage investigation

## Example for Next Session

```
/speckit.review      # All 7 agents in parallel
memory think --call claude --style Security-Auditor --agent typescript-expert  # Quick single-agent input
```
