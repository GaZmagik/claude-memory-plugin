---
type: learning
title: CLI parser now supports --flag=value syntax in addition to --flag value
created: "2026-01-12T20:03:05.628Z"
updated: "2026-01-12T20:03:05.628Z"
tags:
  - cli
  - parser
  - enhancement
  - project
scope: project
---

## Enhancement

Expanded CLI argument parser to accept `--flag=value` syntax alongside `--flag value`. Common in Unix tools and more compact for complex commands.

## Implementation

In `src/cli/parser.ts`, added check for `=` character in long flag arguments (lines 50-56). Extracts key and value, preserves backward compatibility with space-separated syntax.

## Code Pattern

```typescript
const equalsIndex = flagPart.indexOf('=');
if (equalsIndex !== -1) {
  const key = flagPart.slice(0, equalsIndex);
  const value = flagPart.slice(equalsIndex + 1);
  result.flags[key] = value || true;
  continue;
}
```

## Benefits

- Supports `memory query --type=decision --limit=10` syntax
- No breaking changes - space-separated format still works
- Aligns with Unix convention (grep -n=10, etc.)
- Tests pass; CLI boundary tests document actual behavior
