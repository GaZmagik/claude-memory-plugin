---
id: learning-agent-directory-resolution-pattern-consistent-path-resolution-across-crud-operations
title: "Agent directory resolution pattern: Consistent path resolution across CRUD operations"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-02T23:20:23.422Z"
updated: "2026-02-16T22:30:06.884Z"
tags:
  - agent-scoped
  - directory-resolution
  - crud-operations
  - path-management
  - project
---

Phase B implementation requires resolving agent directory paths consistently across write(), read(), delete(), searchMemories(), and semanticSearch(). Pattern: check if scope is agent-scoped, then resolve basePath via createAgentDirectory(). This ensures all agent memories route to correct storage location.
