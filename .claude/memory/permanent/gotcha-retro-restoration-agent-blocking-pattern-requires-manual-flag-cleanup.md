---
id: gotcha-retro-restoration-agent-blocking-pattern-requires-manual-flag-cleanup
title: Gotcha retro - Restoration agent blocking pattern requires manual flag cleanup
type: gotcha
scope: project
created: "2026-01-25T09:58:41.962Z"
updated: "2026-01-25T09:58:41.962Z"
tags:
  - retrospective
  - process
  - session-restore
  - hooks
  - project
severity: medium
---

All three restoration agents (memory-recall, memory-curator, check-gotchas) failed to modify files during session restore because restoring flag was still active. They succeeded anyway by reporting analysis-only results, but the workaround (human removes flag post-completion) should be automated. Pattern: PostToolUse hook should clean restoring flag automatically after all restoration agents report success, not require manual rm. Currently blocks implementation tasks until flag manually cleared.
