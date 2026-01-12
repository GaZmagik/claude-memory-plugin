---
id: gotcha-vitest-mocking-reference-binding-gotcha
title: vitest Mocking - Reference Binding Gotcha
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-12T18:01:10.614Z"
updated: "2026-01-12T22:02:47.197Z"
tags:
  - vitest
  - testing
  - typescript
  - mocking
  - project
severity: high
---

# vitest Function Mocking - Module Reference Binding

**Problem**: `vi.spyOn()` on module functions works ONLY if spying happens before references are captured at module load time.

**Example**:
```typescript
// BAD - doesn't work
const HANDLERS = {
  read: cmdRead,  // Reference captured here
};

// Later in test
vi.spyOn(crudModule, 'cmdRead').mockResolvedValue(...)  // Too late!
```

**Fix**: Test dispatcher logic (routing) not handler invocation, OR refactor to lookup handlers dynamically.

**Impact**: Command handler tests must mock dependencies (core functions) not the handler itself. Test the handler's logic (arg parsing, validation) not whether it gets called.
