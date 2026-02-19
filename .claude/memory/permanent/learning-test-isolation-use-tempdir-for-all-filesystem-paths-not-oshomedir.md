---
id: learning-test-isolation-use-tempdir-for-all-filesystem-paths-not-oshomedir
title: "Test isolation: Use tempDir for all filesystem paths, not os.homedir()"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-19T09:55:26.020Z"
updated: "2026-02-19T11:03:33.269Z"
tags:
  - testing
  - discovery
  - file-indexing
  - test-isolation
  - project
---

File discovery tests must isolate ALL paths (homeDir, projectRoot, gitRoot) to temporary directories to prevent tests from finding real files in actual home directory. Tests discovered real CLAUDE.md files, breaking assertions until all paths were redirected to tempDir.
