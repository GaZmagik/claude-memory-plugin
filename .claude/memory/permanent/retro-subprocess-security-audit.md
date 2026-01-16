---
id: retro-subprocess-security-audit
title: Subprocess Security Needs Dedicated Audit Step
type: gotcha
scope: project
created: "2026-01-16T09:25:00Z"
updated: "2026-01-16T09:45:54.040Z"
tags:
  - retrospective
  - process
  - security
  - code-review
  - subprocess
  - shell-injection
severity: high
---

# Subprocess Security Needs Dedicated Audit Step

## Gotcha

Shell injection vulnerability hid in `hooks/src/session/spawn-session.ts:138` using `$(cat "$CONTEXT_FILE")` command substitution. This bypassed normal code review despite careful subprocess handling elsewhere in codebase.

## Root Cause

- Most subprocess calls use safe `execFileSync([command, arg1, arg2])` pattern
- One call uses `execSync(string)` with command substitution
- Inconsistency not caught by automated checks or visual review
- Shell syntax requires special vigilance

## Prevention

For future security reviews:
1. Grep for all `execSync`, `exec`, `system` calls (not just `execFileSync`)
2. Check for template literals or string concatenation in command strings
3. Verify environment variable expansion is safe
4. Consider lint rule to ban `execSync(string)` in favour of `execFileSync([])`

## Impact

This was caught during pre-shipping review before release, but could have been RCE vulnerability in production.

## Learning

Subprocess security requires separate audit checklist beyond general code review. Can't be assumed safe just because 95% of calls follow safe pattern.
