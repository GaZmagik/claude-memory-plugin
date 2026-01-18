---
id: artifact-artifact-cli-test-pattern-json-stdinstdout-with-log-line-filtering
title: "Artifact - CLI test pattern: JSON stdin/stdout with log line filtering"
type: artifact
scope: project
created: "2026-01-16T17:06:28.731Z"
updated: "2026-01-16T17:06:28.731Z"
tags:
  - retrospective
  - artifact
  - testing
  - cli
  - project
severity: medium
---

Quickstart validation tests spawn CLI with JSON stdin/stdout. CLI outputs INFO log lines before JSON response, breaking JSON parsing.

Solution: Robust JSON extraction with multiple fallback patterns:
1. Try direct JSON.parse(stdout)
2. Match /^({[\s\S]*})$/m for JSON starting at line boundary
3. Iterate lines, accumulate from first { to end of valid JSON

Implementation (test harness):
```typescript
function runCli(args: string[], cwd: string, stdinJson?: object): CliResult {
  const result = spawnSync('bun', [CLI_PATH, ...args], { cwd, input: JSON.stringify(stdinJson) });
  const stdout = result.stdout || '';
  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    const jsonMatch = stdout.match(/^({[\s\S]*})$/m);
    if (jsonMatch) try { json = JSON.parse(jsonMatch[1]); } catch {}
    else {
      const lines = stdout.split('\n');
      let jsonStr = '';
      let inJson = false;
      for (const line of lines) {
        if (line.startsWith('{')) { inJson = true; jsonStr = line; }
        else if (inJson) jsonStr += '\n' + line;
      }
      if (jsonStr) try { json = JSON.parse(jsonStr); } catch {}
    }
  }
  return { stdout, exitCode: result.status ?? 1, json };
}
```

Reusable for any CLI test that outputs log lines before JSON.
