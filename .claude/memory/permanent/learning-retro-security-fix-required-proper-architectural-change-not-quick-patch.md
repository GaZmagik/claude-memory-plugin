---
id: learning-retro-security-fix-required-proper-architectural-change-not-quick-patch
title: Retro - Security fix required proper architectural change, not quick patch
type: learning
scope: project
created: "2026-01-18T12:15:37.310Z"
updated: "2026-01-18T12:15:37.310Z"
tags:
  - retrospective
  - process
  - security
  - architecture
  - project
severity: high
---

The M1 word-split security issue (spawn-session.ts) initially seemed like a simple fix: pass plugin dirs to spawnSessionWithContext.

**What actually happened**: The proper fix required rearchitecting how arguments are passed - writing to a temp file instead of space-joined strings, then reading line-by-line in bash.

**Key insight**: Security issues often signal deeper architectural problems. A "quick fix" would have only patched the symptom. The proper fix ensures future plugin directories with spaces won't break.

**For next time**: Don't accept the first fix that makes tests pass. Security findings warrant deeper investigation of the root cause.
