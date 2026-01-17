---
id: gotcha-retro-old-bash-mermaid-had-critical-filtering-features-missing-from-typescript
title: Retro - Old bash mermaid had critical filtering features missing from TypeScript
type: gotcha
scope: project
created: "2026-01-16T23:53:35.400Z"
updated: "2026-01-16T23:53:35.400Z"
tags:
  - retrospective
  - process
  - tooling
  - mermaid-command
  - feature-regression
  - project
severity: high
---

Discovered that previous bash memory.disabled skill (mermaid.sh) had sophisticated filtering: --from <id> --depth N for BFS subgraphs, --feature <num> for feature filtering, default hub-focused view (not full graph dump), --direction/--output flags, and markdown wrapper with code fence. Current TypeScript version only has --direction and --show-type, outputs raw JSON mermaid instead of .md file. This is why suggest-links produced 61KB unreadable hairball. Must port filtering features back: --hub <id> --all, abbreviate edge labels, add --output, save as .md with code fence. User explicitly requested this before entering plan mode.
