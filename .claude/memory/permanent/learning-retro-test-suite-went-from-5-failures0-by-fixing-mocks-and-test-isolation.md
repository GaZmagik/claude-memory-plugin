---
id: learning-retro-test-suite-went-from-5-failures0-by-fixing-mocks-and-test-isolation
title: Retro - Test suite went from 5 failures→0 by fixing mocks and test isolation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-07T15:35:44.319Z"
updated: "2026-02-16T22:30:07.554Z"
tags:
  - retrospective
  - process
  - testing
  - debugging
  - project
severity: medium
---

Started with 2651 pass, 5 fail. Root causes identified and fixed:

1. **Mock target mismatch (agent-graph.spec.ts)**: Tests mocked sync fs functions but implementation used async fsUtils. Updated mocks to target correct module.

2. **Scope detection logic (scan-agent-directories.ts)**: getAgentInfo() used path.includes() which matched both project and global paths. Fixed by checking against os.homedir().

3. **Test pollution from mermaid-agent-shared.spec.ts**: Test did process.chdir() without restoring original directory, causing downstream tests to fail with ENOENT when trying to chdir back.

Outcome: 2651→2654 pass, 0 fail (also added 3 semantic search tests that were marked .todo).

Key: Systematic test failure analysis + tracking down pollution sources is more effective than assuming failures are independent.
