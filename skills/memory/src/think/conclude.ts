/**
 * Think Conclude Module
 *
 * Conclude thinking documents and optionally promote to permanent memories.
 */

import * as path from 'node:path';
import type {
  ThinkConcludeRequest,
  ThinkConcludeResponse,
} from '../types/api.js';
import type { ThoughtEntry } from '../types/think.js';
import { MemoryType, Scope, ThoughtType } from '../types/enums.js';
import {
  parseThinkDocument,
  serialiseThinkDocument,
  formatThought,
  concludeFrontmatter,
} from './frontmatter.js';
import { thinkDocumentExists, getThinkFilePath } from './document.js';
import {
  getCurrentDocumentId,
  clearCurrentDocument,
} from './state.js';
import { validateThinkConclude } from './validation.js';
import { writeFileAtomic, readFile, fileExists } from '../core/fs-utils.js';
import { writeMemory } from '../core/write.js';
import { getScopePath } from '../scope/resolver.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('think-conclude');

/**
 * Get scope path from context
 */
function resolveScopePath(scope: Scope, basePath: string, globalPath: string): string {
  return getScopePath(scope, basePath, globalPath);
}

/**
 * Build promoted memory content from think document
 *
 * Only includes the conclusion - deliberation trail is stripped to keep
 * promoted memories concise and embeddable. The original think document
 * is preserved in temporary/ as a reference for the full deliberation.
 */
function buildPromotedContent(params: {
  topic: string;
  conclusion: string;
  thoughts: ThoughtEntry[];
  documentId: string;
}): string {
  const { topic, conclusion, documentId } = params;
  const parts: string[] = [];

  // Conclusion only - deliberation stripped for embedding compatibility
  parts.push(`# ${topic}`);
  parts.push('');
  parts.push(conclusion);
  parts.push('');
  parts.push(`_Deliberation: \`${documentId}\`_`);

  return parts.join('\n');
}

/**
 * Map promotion type to MemoryType
 */
function mapPromotionType(promoteType: string): MemoryType {
  switch (promoteType.toLowerCase()) {
    case 'decision':
      return MemoryType.Decision;
    case 'learning':
      return MemoryType.Learning;
    case 'artifact':
      return MemoryType.Artifact;
    case 'gotcha':
      return MemoryType.Gotcha;
    default:
      return MemoryType.Learning; // Default fallback
  }
}

/**
 * Generate memory ID from topic
 */
function generateMemoryId(topic: string, memoryType: MemoryType): string {
  // Normalise topic to kebab-case
  const normalised = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const prefix = memoryType.toLowerCase();
  return `${prefix}-${normalised}`;
}

/**
 * Conclude a thinking document
 */
export async function concludeThinkDocument(
  request: ThinkConcludeRequest
): Promise<ThinkConcludeResponse> {
  const validation = validateThinkConclude(request);
  if (!validation.valid) {
    const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    log.error('Validation failed', { errors: errorMessages });
    return {
      status: 'error',
      error: errorMessages,
    };
  }

  const basePath = request.basePath ?? process.cwd();
  const globalPath = path.join(process.env.HOME ?? '', '.claude', 'memory');

  // Determine target document
  let documentId = request.documentId;
  let documentScope: Scope | undefined;

  if (!documentId) {
    // Find current document from either scope
    for (const scope of [Scope.Project, Scope.Local]) {
      const scopePath = resolveScopePath(scope, basePath, globalPath);
      const currentId = getCurrentDocumentId(scopePath);
      if (currentId) {
        documentId = currentId;
        documentScope = scope;
        break;
      }
    }
  }

  if (!documentId) {
    return {
      status: 'error',
      error: 'No document specified and no current document set',
    };
  }

  // Find the document if scope not determined
  if (!documentScope) {
    const result = thinkDocumentExists(documentId, basePath, globalPath);
    if (!result.exists || !result.scope) {
      return {
        status: 'error',
        error: `Think document not found: ${documentId}`,
      };
    }
    documentScope = result.scope;
  }

  const scopePath = resolveScopePath(documentScope, basePath, globalPath);
  const filePath = getThinkFilePath(scopePath, documentId);

  if (!fileExists(filePath)) {
    return {
      status: 'error',
      error: `Think document not found: ${documentId}`,
    };
  }

  try {
    // Read and parse existing document
    const content = readFile(filePath);
    const parsed = parseThinkDocument(content);

    // Check if already concluded
    if (parsed.frontmatter.status === 'concluded') {
      return {
        status: 'error',
        error: `Document already concluded: ${documentId}`,
      };
    }

    const timestamp = new Date().toISOString();

    // Add conclusion thought
    const conclusionEntry: ThoughtEntry = {
      timestamp,
      type: ThoughtType.Conclusion,
      content: request.conclusion,
    };

    const conclusionMarkdown = formatThought(conclusionEntry);
    const updatedContent = parsed.rawContent + '\n\n' + conclusionMarkdown;

    // Update frontmatter
    let promotedToId: string | undefined;

    if (request.promote) {
      const memoryType = mapPromotionType(request.promote);
      promotedToId = generateMemoryId(parsed.frontmatter.topic, memoryType);
    }

    const updatedFrontmatter = concludeFrontmatter(
      parsed.frontmatter,
      request.conclusion,
      promotedToId
    );

    // Write updated think document
    const fileContent = serialiseThinkDocument(updatedFrontmatter, updatedContent);
    writeFileAtomic(filePath, fileContent);

    // Clear as current document
    clearCurrentDocument(scopePath);

    log.info('Concluded think document', { documentId, promoted: !!request.promote });

    // Handle promotion if requested
    if (request.promote && promotedToId) {
      const memoryType = mapPromotionType(request.promote);

      // Build promoted content with deliberation trail
      const promotedContent = buildPromotedContent({
        topic: parsed.frontmatter.topic,
        conclusion: request.conclusion,
        thoughts: [...parsed.thoughts, conclusionEntry],
        documentId,
      });

      // Generate tags from think document
      const promotedTags = [
        ...parsed.frontmatter.tags.filter(t => t !== 'think' && t !== 'active' && t !== 'concluded'),
        'promoted-from-think',
      ];

      // Create permanent memory in same scope as think document
      // Note: Don't prefix title with type - generateId already adds type prefix to ID
      const writeResult = await writeMemory({
        title: parsed.frontmatter.topic,
        type: memoryType,
        content: promotedContent,
        tags: promotedTags,
        scope: documentScope,
        basePath,
        links: [], // Could link to related memories if needed
      });

      if (writeResult.status === 'error') {
        log.error('Failed to promote memory', { error: writeResult.error });
        return {
          status: 'success',
          concluded: {
            id: documentId,
            conclusion: request.conclusion,
          },
          // Promotion failed but conclusion succeeded
        };
      }

      log.info('Promoted think document to memory', {
        documentId,
        promotedToId,
        memoryType,
      });

      return {
        status: 'success',
        concluded: {
          id: documentId,
          conclusion: request.conclusion,
        },
        promoted: {
          id: promotedToId,
          type: memoryType,
          filePath: writeResult.memory?.filePath ?? '',
        },
      };
    }

    return {
      status: 'success',
      concluded: {
        id: documentId,
        conclusion: request.conclusion,
      },
    };
  } catch (error) {
    log.error('Failed to conclude think document', { documentId, error: String(error) });
    return {
      status: 'error',
      error: `Failed to conclude think document: ${String(error)}`,
    };
  }
}
