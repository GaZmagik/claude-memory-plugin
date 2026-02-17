---
id: learning-sync-io-in-async-functions-silently-blocks-entire-event-loop
title: Sync I/O in async functions silently blocks entire event loop
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T23:49:24.590Z"
updated: "2026-02-16T22:30:07.230Z"
tags:
  - nodejs
  - performance
  - async-await
  - antipattern
  - project
---

fs.readFileSync/writeFileSync inside async functions don't return promises—they block synchronously. With large graphs (1000+ memories), every operation stalls the event loop. Three independent agents flagged this. Use fsp (promises API) for all I/O in async contexts.
