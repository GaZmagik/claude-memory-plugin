---
id: learning-oshomedir-replaced-processenvhome-in-production-code
title: os.homedir() replaced process.env.HOME in production code
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-09T10:51:53.470Z"
updated: "2026-02-16T22:30:07.454Z"
tags:
  - nodejs
  - environment
  - cross-platform
  - home-directory
  - project
---

Migration from process.env.HOME to os.homedir() in hooks/pre-tool-use/protect-memory-directory.ts eliminated 26 instances of environment variable usage. Production code must use os.homedir() for cross-platform home directory resolution, while test files can retain process.env.HOME for test setup.
