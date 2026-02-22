---
id: learning-batch-processing-error-resilience-requires-promiseallsettled
title: Batch processing error resilience requires Promise.allSettled
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:52:23.963Z"
updated: "2026-02-21T12:52:43.997Z"
tags:
  - batch-processing
  - error-handling
  - concurrency
  - project
---

When testing concurrent batch processing with error handling, Promise.allSettled() captures both successes and failures allowing other batches to continue. Tested with 3 batch sizes (10, 25, 11 files) and concurrency limits (2-4).
