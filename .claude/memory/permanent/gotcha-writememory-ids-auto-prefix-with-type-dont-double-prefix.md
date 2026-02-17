---
id: gotcha-writememory-ids-auto-prefix-with-type-dont-double-prefix
title: writeMemory IDs auto-prefix with type - don't double-prefix
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-05T16:13:01.048Z"
updated: "2026-02-16T22:30:07.184Z"
tags:
  - memory-system
  - testing
  - project
---

writeMemory() automatically prepends type prefix (learning-, decision-, artifact-, gotcha-) to memory IDs. Test setup that includes type prefix in the ID parameter causes double-prefixing: 'decision-agent-mem-1' with type Decision becomes 'decision-decision-agent-mem-1'. Always pass bare ID to writeMemory.
