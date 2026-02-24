---
id: gotcha-retro-t147-test-failures-could-have-been-fixed-with-targeted-basepath-validation-fix
title: Retro - T147 test failures could have been fixed with targeted basePath validation fix
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T22:34:40.821Z"
updated: "2026-02-23T22:36:09.573Z"
tags:
  - retrospective
  - process
  - testing
  - T147
  - project
severity: medium
---

Session correctly diagnosed that T147 suggest-links rule-nodes tests fail because they pass raw tmpdir as basePath instead of properly structured ~/.claude/memory hierarchy. Root cause: tests predate v1.6.2 basePath validation. Rather than deferring, adding mocked process.cwd() → tempDir and using path.join(tempDir, '.claude', 'memory') would have been quick follow-up after main feature. Lesson: don't just document pre-existing failures—if you know the fix, consider quick wins before finishing.
