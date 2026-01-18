---
id: learning-memory-context-hook-graceful-search-degradation
title: Memory context hook graceful search degradation pattern
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-11T13:58:08Z"
updated: "2026-01-13T18:49:49.820Z"
tags:
  - plugin
  - search
  - hook
  - degradation
  - pattern
links:
  - artifact-memory-system-architecture-reference
  - artifact-hook-system-patterns-catalogue
---

## Problem

Original memory-context hook relied on external Python script (`semantic-memory-search.py`) located in `~/.claude/hooks/` which was archived to `~/.claude/hooks/archive/py-legacy/`. Hook failed silently when script wasn't found.

## Solution

Implemented graceful degradation using plugin's own TypeScript modules:

1. **Try semantic search first**: Check if embeddings.json exists and Ollama is available (2s timeout check on http://localhost:11434/api/tags)
2. **Fall back to keyword search**: Extract stopword-filtered keywords from user prompt, search using plugin's `searchMemories()` TypeScript module
3. **Search both scopes**: Local memory first, then global if local finds < 3 results
4. **Single code path**: No external scripts, all via imported modules

## Implementation Details

- `trySemanticSearch()`: Checks embeddings cache existence + Ollama availability, calls `semanticSearch()` from `skills/memory/src/search/semantic.ts` with 0.4 threshold
- `keywordSearch()`: Calls `searchMemories()` from `skills/memory/src/core/search.ts` for each keyword, deduplicates by ID
- `extractKeywords()`: Strips 80+ common English stopwords, limits to 10 meaningful terms
- Search method logged for debugging ('semantic' vs 'keyword')

## Result

Hook now works even if Ollama/embeddings unavailable, gracefully degrading from semantic → keyword search. No silent failures.
