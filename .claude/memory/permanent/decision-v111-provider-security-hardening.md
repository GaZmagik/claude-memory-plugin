---
id: decision-v111-provider-security-hardening
title: v1.1.1 provider security hardening
type: decision
scope: project
created: "2026-01-26T16:42:24.119Z"
updated: "2026-01-26T16:42:24.119Z"
tags:
  - security
  - provider
  - project
---

Applied three patterns: (1) sanitise model names vs prompt injection, (2) redact error messages to remove file paths, (3) validate timeout bounds. All integrated into ai-invoke.ts pipeline.
