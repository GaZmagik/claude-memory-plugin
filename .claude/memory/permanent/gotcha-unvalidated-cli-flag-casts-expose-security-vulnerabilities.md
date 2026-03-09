---
id: gotcha-unvalidated-cli-flag-casts-expose-security-vulnerabilities
title: Unvalidated CLI flag casts expose security vulnerabilities
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-03-08T04:33:02.208Z"
updated: "2026-03-08T04:33:24.306Z"
tags:
  - security
  - validation
  - cli-flags
  - input-bounds
  - memory-summarize
  - project
---

During feature-006 review, discovered unvalidated casts on user-provided CLI flags: --mode without validation, --typeFilter cast without bounds, --limit without upper bounds, --timeout without upper bounds. These bypass normal validation flow and expose surface to malformed/malicious input. Security review flagged as medium priority (4 items) requiring validation or explicit bounds.
