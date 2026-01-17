---
id: learning-intent-storage-types-for-memory-system-beyond-revisitremind
title: Intent Storage Types for Memory System - Beyond Revisit/Remind
type: learning
scope: project
created: "2026-01-17T22:11:47.074Z"
updated: "2026-01-17T22:11:47.074Z"
tags:
  - promoted-from-think
  - project
---

# Intent Storage Types for Memory System - Beyond Revisit/Remind

Intent storage (revisit/remind) should not be added as a separate memory type. Multi-agent deliberation revealed: (1) Knowledge is append-only and compounds in value; intent is consumable and decays—fundamentally different lifecycles. (2) The handover system already solves session continuity; enhancing handover structure with explicit intent sections is preferable to new storage. (3) SDD artifacts (tasks.md checkboxes, clarification markers) already encode intent implicitly. (4) Searchable tags on existing knowledge (@next-session, @blocked-on) provide intent signalling without new types. (5) The codebase itself encodes intent through unfinished work. (6) Separate intent storage creates graph pollution, temporal testing challenges, documentation drift, and lifecycle complexity. The real problem isn't 'remembering to revisit'—it's context loss between sessions, which handovers already address.

_Deliberation: `thought-20260117-212103009`_
