---
id: gotcha-getscopepath-is-async-sync-wrappers-cause-pathjoinpromise-errors
title: getScopePath is async — sync wrappers cause path.join(Promise) errors
type: gotcha
scope: project
agent: typescript-expert
created: "2026-03-01T15:18:23.068Z"
updated: "2026-03-01T15:18:23.068Z"
tags:
  - resolver
  - async
  - getScopePath
  - testing
  - mocking
  - project
---

`getScopePath` in `src/scope/resolver.ts` is an `async` function (returns `Promise<string>`). Several source files have local sync wrappers that call it WITHOUT `await`:

```ts
// In document.ts and thoughts.ts — WRONG, returns Promise not string:
function resolveScopePath(scope: Scope, basePath: string, globalPath: string): string {
  return getScopePath(scope, basePath, globalPath); // Returns Promise<string>!
}
```

This causes `path.join(Promise, ...)` → `ERR_INVALID_ARG_TYPE` at runtime.

In tests that mock `getScopePath`, use `mockResolvedValue` (not `mockReturnValue`):
```ts
vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue('/path/to/memory');
```

For tests using `allScopes: true`, always mock `getScopePath` to prevent real filesystem scanning which causes timeouts.
