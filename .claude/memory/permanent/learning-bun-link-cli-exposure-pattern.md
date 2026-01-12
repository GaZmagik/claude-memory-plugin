---
id: learning-bun-link-cli-exposure-pattern
title: bun link CLI Exposure Pattern
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T18:01:04.688Z"
updated: "2026-01-12T22:02:47.198Z"
tags:
  - bun
  - package-management
  - cli
  - setup
  - project
---

# bun link Pattern for CLI Exposure

To make TypeScript CLI tools globally available:

1. Add `bin` field to package.json pointing to TypeScript entry file (bun runs TS natively)
2. Add `postinstall: 'bun link'` to scripts - runs automatically after `bun install`
3. Create symlink in `~/.bun/bin/` pointing to package
4. Requires `~/.bun/bin` in user's PATH (often not in shell profile by default)

Documentation in README is critical - users need PATH setup instructions or command won't work despite successful install.
