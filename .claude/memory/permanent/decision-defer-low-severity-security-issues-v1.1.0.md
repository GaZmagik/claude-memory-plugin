---
id: decision-defer-low-severity-security-issues-v1.1.0
title: Defer low-severity security issues to future release
type: decision
scope: project
created: "2026-01-25T20:51:24.337Z"
updated: "2026-01-25T20:51:24.337Z"
tags:
  - security
  - deferral
  - threat-model
  - v1.1.0
  - project
---

Two low-severity security issues identified during pre-shipping review were deferred: (1) Path traversal in hint-tracker sessionId - mitigated by trusted CLAUDE_SESSION_ID source; (2) Info disclosure in error logs - acceptable for local CLI tool. Both would become actionable only if threat model changes (multi-tenant, cloud features). Deferring keeps v1.1.0 ship date unblocked.
