---
id: gotcha-retro-define-security-constraint-scope-before-implementation
title: Retro - Define security constraint scope before implementation
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-20T19:22:45.485Z"
updated: "2026-02-20T22:00:32.666Z"
tags:
  - retrospective
  - process
  - security
  - project
severity: medium
---

When adding external path validation, initial implementation was overly strict and rejected test fixtures in temp directories. Root cause: allowlist scope (what paths are valid?) was not defined before coding. Prevention: for any security constraint, document expected scope in comments before implementation. Example: external files must be in basePath or explicitly approved dirs - define this first.
