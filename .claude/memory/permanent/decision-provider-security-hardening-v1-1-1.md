---
id: decision-provider-security-hardening-v1-1-1
title: Add security hardening to provider CLI invocation
type: decision
scope: project
created: "2026-01-26T16:24:50.454Z"
updated: "2026-01-26T16:24:50.454Z"
tags:
  - security
  - provider
  - hardening
  - project
---

Model name sanitisation (whitelist validation) and timeout bounds (MIN/MAX constants) added to prevent argument injection and resource exhaustion. Error messages now strip paths to prevent information leakage.
