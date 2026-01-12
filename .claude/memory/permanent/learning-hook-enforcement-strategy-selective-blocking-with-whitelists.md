---
id: learning-hook-enforcement-strategy-selective-blocking-with-whitelists
title: Hook Enforcement Strategy - Selective Blocking with Whitelists
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:40:30.559Z"
updated: "2026-01-12T22:02:47.187Z"
tags:
  - hooks
  - enforcement
  - architecture
  - project
---

Use pattern whitelists for allowed operations (memory CLI, read-only commands) rather than blocklisting all variants. Allows memory CLI and legacy memory.sh during transition. Pattern: check whitelist first, then blocklist. Prevents false positives on similar non-memory paths.
