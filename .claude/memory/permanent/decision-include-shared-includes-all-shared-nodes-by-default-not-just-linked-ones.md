---
id: decision-include-shared-includes-all-shared-nodes-by-default-not-just-linked-ones
title: Decision - --include-shared includes ALL shared nodes by default, not just linked ones
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-06T00:27:58.408Z"
updated: "2026-02-16T22:30:07.303Z"
tags:
  - retrospective
  - decision
  - mermaid
  - scope
  - project
severity: medium
---

The original --include-shared design for mermaid diagrams only included project/global memories that had edges linking to agent nodes. However: (1) cross-scope edges cannot be created (by design constraint), so (2) no edges ever exist between agent and shared nodes, (3) so nothing ever gets included. Changed semantics: --include-shared now includes ALL shared scope nodes. Added --filter-linked flag to restore the 'only connected' behavior if needed. This clarification resolves the impossible design and aligns with user expectation: --include-shared means 'show agent memories PLUS all project memories'.
