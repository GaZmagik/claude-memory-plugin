---
id: learning-mock-processcwd-for-temp-directory-integration-tests
title: Mock process.cwd() for temp directory integration tests
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T17:28:58.273Z"
updated: "2026-02-23T17:29:22.686Z"
tags:
  - suggest-links
  - security
  - testing
  - mocking
  - project
---

External integration tests using tempDir need process.cwd() mocked to match tempDir so M2 basePath validator sees it as a valid project root. Mock before test, restore in afterEach() to prevent validator rejection.
