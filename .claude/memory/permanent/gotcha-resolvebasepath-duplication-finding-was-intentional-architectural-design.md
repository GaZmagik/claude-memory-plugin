---
id: gotcha-resolvebasepath-duplication-finding-was-intentional-architectural-design
title: resolveBasePath duplication finding was intentional architectural design
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-27T21:33:02.192Z"
updated: "2026-02-28T09:20:42.529Z"
tags:
  - code-review
  - architecture
  - false-positive
  - verification
  - project
---

H7 code review flagged apparent duplication of agent scope resolution across 5 CRUD files. Investigation revealed 4 files already migrated to shared utility; 5th file (write.ts) intentionally retains different logic (sanitisation, validation, directory creation). Not duplication—architectural split. Verification prevented unnecessary refactoring.
