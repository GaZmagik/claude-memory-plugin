---
id: gotcha-retro-hook-type-mapping-case-sensitivity-in-error-handler
title: Retro - Hook type mapping case sensitivity in error-handler
type: gotcha
scope: project
created: "2026-01-17T12:37:27.513Z"
updated: "2026-01-17T12:37:27.513Z"
tags:
  - retrospective
  - hooks
  - debugging
  - project
severity: high
---

SessionStart hooks in session-start/ directory failed to output plain text because typeMap had generic "session" -> "Session" but not "session-start" -> "SessionStart". The isSessionHook() check used startsWith("Session") which failed on "session-start" (lowercase). Lesson: When mapping directory names to hook types, must handle all specific variants (session-start, session-end) not just generic names.
