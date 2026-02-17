---
id: learning-test-isolation-processchdir-contamination-solved-with-oshomedir
title: "Test isolation: process.chdir contamination solved with os.homedir()"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-06T21:47:09.258Z"
updated: "2026-02-16T22:30:07.426Z"
tags:
  - testing
  - test-isolation
  - process-chdir
  - project
---

When tests use process.chdir() to create temp directories, prior tests that don't restore cwd can leave it pointing to a deleted directory. Solution: capture os.homedir() at module scope (always exists) as restore target instead of capturing originalCwd in beforeEach (may already be contaminated). Applied to 4 integration test files.
