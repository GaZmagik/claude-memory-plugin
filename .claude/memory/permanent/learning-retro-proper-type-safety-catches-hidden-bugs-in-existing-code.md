---
id: learning-retro-proper-type-safety-catches-hidden-bugs-in-existing-code
title: Retro - Proper type safety catches hidden bugs in existing code
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-22T16:51:33.419Z"
updated: "2026-02-22T16:52:10.744Z"
tags:
  - retrospective
  - process
  - type-safety
  - bug-discovery
  - project
severity: high
---

While replacing 'any' types in crud.ts, the session discovered a real bug in the semantic search sorting logic: code referenced '.similarity' field that doesn't exist on SemanticSearchResultItem (correct field is '.score'). This bug was hidden by the 'any' casts. The type safety work revealed that replacing generic 'any' types isn't just about code quality—it actively catches real runtime errors that would have surfaced in production. This validates the investment in proper typing.
