---
id: gotcha-test-writes-to-wrong-path-when-using-projectroot-instead-of-basepath
title: Gotcha - Test writes to wrong path when using projectRoot instead of basePath
type: gotcha
scope: project
created: "2026-02-06T00:27:49.606Z"
updated: "2026-02-06T00:27:49.606Z"
tags:
  - retrospective
  - gotcha
  - tdd
  - test-setup
  - project
severity: high
---

The test-mermaid-agent-shared test used projectRoot parameter for project-scope memory writes, but writeMemory ignores projectRoot for non-agent scopes. It defaults to process.cwd(). However, the path resolver (resolveSharedScopePaths) expects project memories at cwd/.claude/memory. Result: test writes to testDir/, resolver looks in testDir/.claude/memory/, graph loads are empty. Fix: Use basePath: path.join(testDir, '.claude', 'memory') for all project/global scope writes. TDD implication: tests must write data to exact paths the implementation reads from, or tests pass but implementation fails.
