---
id: gotcha-stream-event-listener-cleanup-race-condition-in-subprocess-timeout-handlers
title: Stream event listener cleanup race condition in subprocess timeout handlers
type: gotcha
scope: project
created: "2026-01-25T21:18:52.159Z"
updated: "2026-01-25T21:18:52.159Z"
tags:
  - subprocess
  - streams
  - concurrency
  - cleanup
  - project
---

When terminating a child process due to timeout, calling removeAllListeners() on stdout/stderr before the process emits 'close' event creates a race condition. Instead, selectively remove only 'data' listeners and let the close handler complete the cleanup.
