---
id: learning-claude-code-review-identified-critical-ssrf-and-guard-gaps
title: Claude code review identified critical SSRF and guard gaps
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T10:25:18.171Z"
updated: "2026-02-22T10:26:21.042Z"
tags:
  - feature-005
  - security
  - code-review
  - patterns
  - project
---

Automated code review found incomplete SSRF blocklist (missing IPv6 loopback, 0.0.0.0). Discovered missing read-only guards on cmdArchive for external nodes. Promise.all should use Promise.allSettled per team learning. Require() used in ESM context instead of imported os module.
