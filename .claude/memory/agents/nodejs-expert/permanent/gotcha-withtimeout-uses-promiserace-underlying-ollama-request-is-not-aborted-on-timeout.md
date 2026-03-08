---
id: gotcha-withtimeout-uses-promiserace-underlying-ollama-request-is-not-aborted-on-timeout
title: withTimeout uses Promise.race — underlying Ollama request is not aborted on timeout
type: gotcha
scope: project
agent: nodejs-expert
created: "2026-03-08T01:21:41.764Z"
updated: "2026-03-08T01:21:41.764Z"
tags:
  - ollama
  - timeout
  - memory-leak
  - async
  - project
---

The withTimeout() helper in ollama.ts uses Promise.race([promise, timeout]). When the timeout fires, the Ollama HTTP request (getClient().generate()) continues running in the background — it is never cancelled. The Ollama client does not expose an AbortController or similar cancellation mechanism. In practice for a CLI this is acceptable (process exits after the command), but in any long-lived server context this would cause request accumulation and memory pressure. The clearTimeout in the finally block correctly prevents the timer from outliving the race, so there is no Node.js timer leak — only an orphaned in-flight HTTP request.
