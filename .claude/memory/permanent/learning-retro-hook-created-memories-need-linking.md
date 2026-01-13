---
id: learning-retro-hook-created-memories-need-linking
title: "retro: Hook-Created Memories Not Auto-Linked Into Graph"
type: learning
scope: project
tags:
  - retrospective
  - process
  - hooks
  - memory-graph
---

Pre-compact hook creates retrospective learnings but leaves them unlinked (0 edges). 
Three new learnings after this session are isolated nodes. Consider:

1. Auto-linking pass at end of hook execution
2. Defer linking to session-restore agent (cleaner separation)
3. Link during memory-commit workflow instead of retrospective hook

Isolated memories break graph cohesion and reduce discoverability.
