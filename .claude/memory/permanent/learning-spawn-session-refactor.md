---
id: learning-spawn-session-refactor
title: spawn-session-refactor
type: decision
scope: local
project: claude-memory-plugin
created: "2026-01-11T17:55:11Z"
updated: "2026-01-13T13:24:06.205Z"
tags:
  - learning
  - tip
  - medium
  - architecture
  - refactoring
  - session-management
links:
  - learning-post-compaction-memory-restoration-prevented-duplicate-work
---

# spawn-session-refactor

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

Session spawning architecture refactored

## Problem

Previous --fork-session pattern was complex, required separate HOME directories, and difficult to test in isolation

## Solution

Changed to fresh session spawning using extractContextAsSystemPrompt() to inject conversation context via --additional-system-prompt flag. New spawn-session.ts module handles creation with proper context extraction.
