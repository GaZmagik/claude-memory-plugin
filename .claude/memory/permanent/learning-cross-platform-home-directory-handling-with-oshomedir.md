---
id: learning-cross-platform-home-directory-handling-with-oshomedir
title: Cross-platform home directory handling with os.homedir()
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-07T18:33:38.306Z"
updated: "2026-02-16T22:30:07.438Z"
tags:
  - nodejs
  - cross-platform
  - environment-variables
  - project
---

Replacing 17 scattered instances of process.env.HOME with os.homedir() ensures cross-platform compatibility (handles Windows USERPROFILE). Fixed in core modules (read, write, delete, search, semantic-search) and think modules (conclude, thoughts, document, discovery, enterprise) - single source of truth prevents environment-specific failures.
