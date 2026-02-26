---
id: learning-execfile-maxbuffer-overflow-on-cli-commands-with-verbose-output
title: execFile maxBuffer overflow on CLI commands with verbose output
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-26T14:11:41.794Z"
updated: "2026-02-26T14:11:46.998Z"
tags:
  - bun
  - testing
  - node
  - child-process
  - cli
  - project
---

Node's execFile() defaults to 1MB maxBuffer. When testing CLI commands with verbose output (e.g., health/info commands), stdout can exceed this limit (~1MB), causing buffer overflow errors. Solution: increase maxBuffer to 10MB+ in test runner setup when invoking external processes.
