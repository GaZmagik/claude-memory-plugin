---
id: gotcha-post-session-continue-tool-unlock-can-fail-silently
title: Gotcha - Post-session-continue tool unlock can fail silently
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-04T16:57:22.664Z"
updated: "2026-02-16T22:30:07.330Z"
tags:
  - retrospective
  - process
  - session-restore
  - hooks
  - project
severity: high
---

After `/session-restore` and `/session-continue` commands, encountered situation where tools remained blocked even though both commands supposedly completed.

Problem: Flag cleanup hook (PostToolUse) that removes 'restoring' flag may not fire reliably, leaving tools permanently blocked.

Symptoms: All tools (Bash, Read, Grep) blocked with 'Compaction occurred' message despite restoration being complete.

Resolution: Manual cleanup was needed (investigated by checking .claude/flags/ state).

Prevention for next time:
- Explicitly verify flag removal after /session-continue
- Check .claude/flags/ to confirm no 'restoring-*' files remain
- Provide clearer recovery instructions in tool error messages
- Consider making flag cleanup more reliable (explicit command vs hook-based)
