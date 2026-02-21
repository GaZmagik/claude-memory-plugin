---
id: learning-security-mermaid-output-paths-need-boundary-validation
title: "Security: Mermaid output paths need boundary validation"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T08:57:48.959Z"
updated: "2026-02-21T08:58:05.223Z"
tags:
  - security
  - file-operations
  - path-validation
  - project
---

Output path validation using isInsideDir() prevents arbitrary file writes via --output flag. Without validation, attacker can write to parent directories. Atomic writes with writeFileAtomic() further hardens against partial writes.
