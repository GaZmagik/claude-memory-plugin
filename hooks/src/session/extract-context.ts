#!/usr/bin/env bun
/**
 * Session Context Extractor
 *
 * Extracts conversation context from JSONL session files since the last compaction.
 * Strips metadata and keeps only the essential content (thinking, text, tool calls).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ExtractedContent {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'user';
  content: string;
  toolName?: string;
}

export interface ExtractionResult {
  sessionId: string;
  linesExtracted: number;
  totalLines: number;
  compactionLine: number;
  content: ExtractedContent[];
  formattedText: string;
  byteSize: number;
}

/**
 * Convert cwd to project path format used by Claude Code
 * e.g., /home/gareth/.vs/project -> -home-gareth--vs-project
 * Both / and . are converted to -
 */
export function cwdToProjectPath(cwd: string): string {
  return cwd.replace(/[/.]/g, '-');
}

/**
 * Find the JSONL file for a session
 */
export function findSessionJsonl(sessionId: string, cwd: string): string | null {
  const home = homedir();
  const projectPath = cwdToProjectPath(cwd);
  const jsonlPath = join(home, '.claude', 'projects', projectPath, `${sessionId}.jsonl`);

  if (existsSync(jsonlPath)) {
    return jsonlPath;
  }

  return null;
}

/**
 * Parse a JSONL line and extract content
 */
function parseJsonlLine(line: string): ExtractedContent[] {
  const results: ExtractedContent[] = [];

  try {
    const obj = JSON.parse(line);

    // Get content array from message.content or content
    const contentArray = obj.message?.content || obj.content || [];

    // Handle user messages
    if (obj.type === 'user' && typeof obj.message === 'string') {
      results.push({
        type: 'user',
        content: obj.message,
      });
      return results;
    }

    // Process content array
    for (const item of contentArray) {
      if (item.type === 'thinking' && item.thinking) {
        results.push({
          type: 'thinking',
          content: item.thinking,
        });
      } else if (item.type === 'text' && item.text) {
        results.push({
          type: 'text',
          content: item.text,
        });
      } else if (item.type === 'tool_use' && item.name) {
        results.push({
          type: 'tool_use',
          content: JSON.stringify(item.input || {}),
          toolName: item.name,
        });
      } else if (item.type === 'tool_result') {
        const resultContent =
          typeof item.content === 'string'
            ? item.content.slice(0, 500)
            : JSON.stringify(item.content || '').slice(0, 500);
        results.push({
          type: 'tool_result',
          content: resultContent,
        });
      }
    }
  } catch {
    // Invalid JSON, skip
  }

  return results;
}

/**
 * Format extracted content as readable text
 */
function formatContent(contents: ExtractedContent[]): string {
  const lines: string[] = [];

  for (const item of contents) {
    switch (item.type) {
      case 'thinking':
        lines.push('[THINKING]');
        lines.push(item.content);
        lines.push('[/THINKING]');
        break;
      case 'text':
        lines.push('[ASSISTANT]');
        lines.push(item.content);
        break;
      case 'user':
        lines.push('[USER]');
        lines.push(item.content);
        break;
      case 'tool_use':
        lines.push(`[TOOL: ${item.toolName}]`);
        lines.push(item.content);
        break;
      case 'tool_result':
        lines.push('[RESULT]');
        lines.push(item.content);
        break;
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extract session context since last compaction
 */
export function extractSessionContext(sessionId: string, cwd: string): ExtractionResult | null {
  const jsonlPath = findSessionJsonl(sessionId, cwd);

  if (!jsonlPath) {
    return null;
  }

  const fileContent = readFileSync(jsonlPath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());
  const totalLines = lines.length;

  // Find the last compaction boundary
  let compactionLine = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line.includes('"subtype":"compact_boundary"')) {
      compactionLine = i + 1; // 1-indexed for reporting
      break;
    }
  }

  // Extract lines since compaction (or all if no compaction found)
  const startIndex = compactionLine > 0 ? compactionLine : 0;
  const relevantLines = lines.slice(startIndex);

  // Parse and extract content
  const allContent: ExtractedContent[] = [];
  for (const line of relevantLines) {
    const extracted = parseJsonlLine(line);
    allContent.push(...extracted);
  }

  // Format as text
  const formattedText = formatContent(allContent);

  return {
    sessionId,
    linesExtracted: relevantLines.length,
    totalLines,
    compactionLine,
    content: allContent,
    formattedText,
    byteSize: Buffer.byteLength(formattedText, 'utf-8'),
  };
}

/**
 * Extract context and return as system prompt suitable for --append-system-prompt
 */
export function extractContextAsSystemPrompt(sessionId: string, cwd: string): string | null {
  const result = extractSessionContext(sessionId, cwd);

  if (!result || result.content.length === 0) {
    return null;
  }

  return `SESSION CONTEXT (${result.linesExtracted} lines since compaction)
================================================================================

The following is the conversation context from this session. Use this to identify
memories worth capturing (decisions, learnings, gotchas, artifacts).

${result.formattedText}

================================================================================
END SESSION CONTEXT`;
}
