---
id: learning-permission-error-tests-should-use-testskipif-for-cross-platform
title: Permission error tests should use test.skipIf for cross-platform
type: learning
scope: project
created: "2026-01-26T23:08:54.663Z"
updated: "2026-01-26T23:08:54.663Z"
tags:
  - testing
  - cross-platform
  - pattern
  - v1.1.2
  - project
---

Filesystem permission tests using chmod don't work reliably on Windows. Instead of try-catch with dummy assertions (expect(true).toBe(true)), use explicit platform skip: test.skipIf(process.platform === 'win32')('should handle permission error', ...). This documents intent clearly and avoids misleading test counts. Example in hooks/session-start/check-bun-installed.spec.ts line 240.
