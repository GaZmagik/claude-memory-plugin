---
id: gotcha-retro-restoring-flag-remained-active-across-multiple-restoration-cycles-creating-repetitive-re-launches
title: Retro - Restoring flag remained active across multiple restoration cycles, creating repetitive re-launches
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:50:22.374Z"
updated: "2026-02-16T22:30:07.570Z"
tags:
  - retrospective
  - process
  - restoration
  - compaction
  - flag-management
  - project
severity: high
---

Third compaction in single session required three separate /session-restore invocations. Root cause: restoring flag from second compaction did not clear properly until /session-continue was invoked at the end. This created a loop where tools remained blocked, forcing re-launch of restoration agents (memory-recall, memory-curator, check-gotchas) three times with identical results. Pattern: After /session-continue clears the flag via PostToolUse hook, the restoring state is truly cleared. But if a new compaction occurs during agent execution, a new flag is created before agents finish. Mitigation: Ensure /session-continue is not invoked until ALL restoration agents have completed and logged their approval keys.
