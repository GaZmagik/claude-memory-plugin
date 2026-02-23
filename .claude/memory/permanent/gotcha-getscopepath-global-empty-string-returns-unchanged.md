---
id: gotcha-getscopepath-global-empty-string-returns-unchanged
title: getScopePath returns third argument directly for Global scope
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-23T09:32:00.889Z"
updated: "2026-02-23T09:32:22.577Z"
tags:
  - scope-resolver
  - cross-scope
  - api-contract
  - project
---

getScopePath(Scope.Global, cwd, globalMemoryPath) returns globalMemoryPath unchanged. Passing empty string returns ''. Caused silent failures in suggest-links when building cross-scope graphs—try/catch swallowed errors, so global scope loading failed silently. Always use path.join(os.homedir(), '.claude', 'memory') instead of empty string.
