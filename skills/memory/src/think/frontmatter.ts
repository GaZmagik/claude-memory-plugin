/**
 * Think Document Frontmatter Utilities
 *
 * Specialised frontmatter handling for thinking documents.
 * Extends the base frontmatter with think-specific fields.
 */

import * as yaml from 'js-yaml';
import { unsafeAsMemoryId, unsafeAsSessionId } from '../types/branded.js';
import type { ThinkFrontmatter, ThoughtEntry } from '../types/think.js';
import { MemoryType, Scope, ThinkStatus, ThoughtType } from '../types/enums.js';

/**
 * Parse result from think document file
 */
export interface ThinkParseResult {
  frontmatter: ThinkFrontmatter;
  thoughts: ThoughtEntry[];
  rawContent: string;
}

/**
 * Serialise think frontmatter to YAML string
 */
export function serialiseThinkFrontmatter(frontmatter: ThinkFrontmatter): string {
  const clean: Record<string, unknown> = {
    type: frontmatter.type,
    title: frontmatter.title,
    topic: frontmatter.topic,
    status: frontmatter.status,
    created: frontmatter.created,
    updated: frontmatter.updated,
    tags: frontmatter.tags,
    scope: frontmatter.scope,
  };

  if (frontmatter.conclusion) {
    clean.conclusion = frontmatter.conclusion;
  }
  if (frontmatter.promotedTo) {
    clean.promotedTo = frontmatter.promotedTo;
  }

  return yaml.dump(clean, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Parse YAML string into think frontmatter
 *
 * Handles backwards compatibility for older think documents:
 * - 'topic' derived from 'title' by removing "Think: " prefix if missing
 * - 'status' derived from 'tags' array ('active'/'concluded') if missing
 */
export function parseThinkFrontmatter(yamlContent: string): ThinkFrontmatter {
  const parsed = yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid think frontmatter: must be a YAML object');
  }

  // Derive topic from title if missing (backwards compatibility)
  if (!parsed.topic && parsed.title && typeof parsed.title === 'string') {
    const title = parsed.title;
    // Remove "Think: " prefix if present
    parsed.topic = title.startsWith('Think: ') ? title.slice(7) : title;
  }

  // Derive status from tags if missing (backwards compatibility)
  if (!parsed.status && Array.isArray(parsed.tags)) {
    const tags = parsed.tags as string[];
    if (tags.includes('concluded')) {
      parsed.status = 'concluded';
    } else if (tags.includes('active')) {
      parsed.status = 'active';
    }
  }

  if (!parsed.topic) {
    throw new Error('Invalid think frontmatter: topic is required (and could not be derived from title)');
  }
  // Note: status may still be undefined here - parseThinkDocument will derive from thoughts

  return parsed as unknown as ThinkFrontmatter;
}

/**
 * Parse thought entries from markdown content
 * Thoughts are formatted as:
 * ### TIMESTAMP - TYPE (AUTHOR)
 * Content...
 */
export function parseThoughts(content: string): ThoughtEntry[] {
  const thoughts: ThoughtEntry[] = [];

  // Match thought headers: ### 2026-01-12T10:00:00.123Z - Thought (Claude [session-id])
  // Note: Timestamp includes optional milliseconds (.XXX) from toISOString()
  const thoughtRegex = /^### (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?) - ([\w-]+)(?: \(([^)]+)\))?\n([\s\S]*?)(?=^### |\n## |$)/gm;

  let match;
  while ((match = thoughtRegex.exec(content)) !== null) {
    const [, timestamp, typeStr, attribution, thoughtContent] = match;

    let type: ThoughtType;
    switch (typeStr.toLowerCase()) {
      case 'counter-argument':
        type = ThoughtType.CounterArgument;
        break;
      case 'alternative':
      case 'branch':
        type = ThoughtType.Branch;
        break;
      case 'conclusion':
        type = ThoughtType.Conclusion;
        break;
      default:
        type = ThoughtType.Thought;
    }

    const entry: ThoughtEntry = {
      timestamp,
      type,
      content: thoughtContent.trim(),
    };

    if (attribution) {
      const attrMatch = attribution.match(/^(\w+)(?: \[([^\]]+)\])?$/);
      if (attrMatch) {
        entry.by = attrMatch[1];
        if (attrMatch[2]) {
          entry.sessionId = unsafeAsSessionId(attrMatch[2]);
        }
      } else {
        entry.by = attribution;
      }
    }

    thoughts.push(entry);
  }

  return thoughts;
}

/**
 * Parse a complete think document file
 *
 * Status derivation (backwards compatibility):
 * 1. Use explicit status from frontmatter if present
 * 2. Otherwise derive from tags ('active'/'concluded')
 * 3. Otherwise derive from last thought (Conclusion type → 'concluded')
 * 4. Default to 'active' if no other indicator
 */
export function parseThinkDocument(fileContent: string): ThinkParseResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid think document format: missing frontmatter delimiters');
  }

  const [, yamlContent, bodyContent] = match;
  const frontmatter = parseThinkFrontmatter(yamlContent);
  const thoughts = parseThoughts(bodyContent);

  // Derive status from last thought if still missing
  if (!frontmatter.status) {
    const lastThought = thoughts[thoughts.length - 1];
    if (lastThought?.type === ThoughtType.Conclusion) {
      frontmatter.status = ThinkStatus.Concluded;
    } else {
      frontmatter.status = ThinkStatus.Active;
    }
  }

  return {
    frontmatter,
    thoughts,
    rawContent: bodyContent.trim(),
  };
}

/**
 * Create initial think document frontmatter
 */
export function createThinkFrontmatter(params: {
  topic: string;
  scope?: Scope;
}): ThinkFrontmatter {
  const now = new Date().toISOString();

  return {
    type: MemoryType.Breadcrumb,
    title: `Think: ${params.topic}`,
    topic: params.topic,
    status: ThinkStatus.Active,
    created: now,
    updated: now,
    tags: ['think', 'active'],
    scope: params.scope ?? Scope.Project,
  };
}

/**
 * Serialise a complete think document to file content
 */
export function serialiseThinkDocument(frontmatter: ThinkFrontmatter, content: string): string {
  const yamlContent = serialiseThinkFrontmatter(frontmatter);
  return `---\n${yamlContent}---\n\n${content}\n`;
}

/**
 * Format a thought entry as markdown
 */
export function formatThought(entry: ThoughtEntry): string {
  let typeLabel: string;
  switch (entry.type) {
    case ThoughtType.CounterArgument:
      typeLabel = 'Counter-argument';
      break;
    case ThoughtType.Branch:
      typeLabel = 'Alternative';
      break;
    case ThoughtType.Conclusion:
      typeLabel = 'Conclusion';
      break;
    default:
      typeLabel = 'Thought';
  }

  let attribution = '';
  if (entry.by) {
    if (entry.sessionId) {
      attribution = ` (${entry.by} [${entry.sessionId}])`;
    } else {
      attribution = ` (${entry.by})`;
    }
  }

  return `### ${entry.timestamp} - ${typeLabel}${attribution}\n${entry.content}`;
}

/**
 * Generate initial think document content
 */
export function generateInitialContent(topic: string): string {
  const now = new Date().toISOString();
  return `# ${topic}\n\n_Thinking document created ${now}_\n\n## Thoughts`;
}

/**
 * Update think frontmatter for conclusion
 */
export function concludeFrontmatter(
  frontmatter: ThinkFrontmatter,
  conclusion: string,
  promotedTo?: string
): ThinkFrontmatter {
  const updated: ThinkFrontmatter = {
    ...frontmatter,
    status: ThinkStatus.Concluded,
    conclusion,
    updated: new Date().toISOString(),
    tags: frontmatter.tags.map(t => t === 'active' ? 'concluded' : t),
  };

  if (promotedTo) {
    updated.promotedTo = unsafeAsMemoryId(promotedTo);
  }

  return updated;
}
