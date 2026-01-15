---
id: learning-spec-documents-can-drift-from-implementation-state
title: Spec documents can drift from implementation state
type: learning
scope: project
created: "2026-01-15T18:02:43.946Z"
updated: "2026-01-15T18:02:43.946Z"
tags:
  - retrospective
  - documentation
  - maintenance
  - medium
  - project
---

tasks.md marked Phase 5 hooks as incomplete [unchecked] when they were all implemented. The file became stale as work progressed but wasn't updated to reflect completion. 

Discovered by manual review: 
- T112-T120 (all hooks) - actually implemented
- T141-T146 (commands/agents) - actually implemented
- But tasks.md never updated after implementation

Improvement: Update spec files as work completes, not in bulk at end. Consider automating checklist updates or adding checklist review to definition-of-done.
