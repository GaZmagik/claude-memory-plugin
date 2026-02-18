---
id: learning-thread-new-fields-through-all-graph-layers-edgemetadata-linkmemoriesrequest-addedge-write-logic
title: "Thread new fields through all graph layers: EdgeMetadata → LinkMemoriesRequest → addEdge write logic"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-18T17:11:45.460Z"
updated: "2026-02-18T17:12:05.748Z"
tags:
  - graph-architecture
  - edge-metadata
  - data-threading
  - phase-d
  - project
---

Adding verifiedRelation required coordinated changes across edges.ts (metadata interface + write logic), operations.ts (request interface), and link.ts (destructuring + field threading). Forgetting any layer causes silent data loss or TS errors.
