#!/usr/bin/env bun
/**
 * protect-memory-directory.ts - Block direct writes to .claude/memory/
 *
 * This hook ensures all memory operations go through the sanctioned
 * memory.sh script, which properly creates YAML frontmatter.
 *
 * Blocks: Write, Edit, MultiEdit to any .claude/memory/ path
 * Allows: Bash calls to memory.sh (the proper way)
 *
 * Exit codes:
 *   0 - Allow the operation
 *   2 - Block the operation
 */

import { runHook, allow, block } from '../src/core/error-handler.ts';

const PROTECTED_TOOLS = ['Write', 'Edit', 'MultiEdit'];

runHook(async (input) => {
  // Only check file modification tools
  if (!input?.tool_name || !PROTECTED_TOOLS.includes(input.tool_name)) {
    return allow();
  }

  // Get file path from tool input
  const filePath = input.tool_input?.file_path as string;
  if (!filePath) {
    return allow();
  }

  // Expand ~ to home directory
  const home = process.env.HOME || '';
  const expandedPath = filePath.replace(/^~/, home);

  // Check if path is in a .claude/memory/ directory
  let isMemoryPath = false;
  let memoryType = '';

  // Check for user/global memory path
  if (expandedPath.startsWith(`${home}/.claude/memory/`)) {
    isMemoryPath = true;
    memoryType = 'user/global';
  }
  // Check for project memory path (any .claude/memory/ in any project)
  else if (expandedPath.includes('/.claude/memory/')) {
    isMemoryPath = true;
    memoryType = 'project';
  }

  if (isMemoryPath) {
    return block(`🚨 DIRECT MEMORY WRITE BLOCKED

You are attempting to directly ${input.tool_name} to .claude/memory/:
  File: ${filePath}
  Type: ${memoryType} memory

Direct writes bypass the memory skill's YAML frontmatter generation,
which can result in malformed memories missing required fields like:
  - project
  - created/updated timestamps
  - proper tag/link formatting

✅ CORRECT APPROACH: Use the memory skill shell script:

  echo '{
    "id": "your-memory-id",
    "title": "Your Memory Title",
    "type": "permanent",
    "scope": "local",
    "tags": ["tag1", "tag2"],
    "links": ["related-memory-id"],
    "content": "Your markdown content here..."
  }' | ~/.claude/skills/memory/memory.sh write

Or use the other memory commands:
  ~/.claude/skills/memory/memory.sh link <source> <target> <relation>
  ~/.claude/skills/memory/memory.sh delete <id>

For graph.json and index.json updates, these are managed
automatically by the memory.sh script.`);
  }

  // Not a memory path, allow the operation
  return allow();
});
