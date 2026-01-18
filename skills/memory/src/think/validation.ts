/**
 * Think Document Validation
 *
 * Validation rules for think operations.
 */

import { Scope, ThinkStatus, ThoughtType, MemoryType } from '../types/enums.js';
import { isValidThinkId } from './id-generator.js';

/**
 * Validation error with field context
 */
export interface ThinkValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ThinkValidationResult {
  valid: boolean;
  errors: ThinkValidationError[];
}

/**
 * Validate a topic string
 */
export function isValidTopic(topic: unknown): topic is string {
  return typeof topic === 'string' && topic.trim().length > 0;
}

/**
 * Validate a think document scope (only Project and Local supported)
 */
export function isValidThinkScope(scope: unknown): scope is Scope {
  return scope === Scope.Project || scope === Scope.Local;
}

/**
 * Validate a think status
 */
export function isValidThinkStatus(status: unknown): status is ThinkStatus {
  return Object.values(ThinkStatus).includes(status as ThinkStatus);
}

/**
 * Validate a thought type
 */
export function isValidThoughtType(type: unknown): type is ThoughtType {
  return Object.values(ThoughtType).includes(type as ThoughtType);
}

/**
 * Validate a memory type for promotion
 */
export function isValidPromotionType(type: unknown): type is MemoryType {
  // Can promote to any permanent memory type except Breadcrumb and Hub
  return (
    type === MemoryType.Decision ||
    type === MemoryType.Learning ||
    type === MemoryType.Artifact ||
    type === MemoryType.Gotcha
  );
}

/**
 * Validate thought content
 */
export function isValidThoughtContent(content: unknown): content is string {
  return typeof content === 'string' && content.trim().length > 0;
}

/**
 * Validate a ThinkCreateRequest
 */
export function validateThinkCreate(request: {
  topic?: unknown;
  scope?: unknown;
}): ThinkValidationResult {
  const errors: ThinkValidationError[] = [];

  if (!isValidTopic(request.topic)) {
    errors.push({ field: 'topic', message: 'topic is required and must be a non-empty string' });
  }

  if (request.scope !== undefined && !isValidThinkScope(request.scope)) {
    errors.push({
      field: 'scope',
      message: `scope must be one of: ${Scope.Project}, ${Scope.Local}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a ThinkAddRequest
 */
export function validateThinkAdd(request: {
  thought?: unknown;
  type?: unknown;
  documentId?: unknown;
}): ThinkValidationResult {
  const errors: ThinkValidationError[] = [];

  if (!isValidThoughtContent(request.thought)) {
    errors.push({
      field: 'thought',
      message: 'thought is required and must be a non-empty string',
    });
  }

  if (!isValidThoughtType(request.type)) {
    errors.push({
      field: 'type',
      message: `type must be one of: ${Object.values(ThoughtType).join(', ')}`,
    });
  }

  if (request.documentId !== undefined && !isValidThinkId(request.documentId as string)) {
    errors.push({
      field: 'documentId',
      message: 'documentId must be a valid think document ID (think-YYYYMMDD-HHMMSS)',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a ThinkConcludeRequest
 */
export function validateThinkConclude(request: {
  conclusion?: unknown;
  documentId?: unknown;
  promote?: unknown;
}): ThinkValidationResult {
  const errors: ThinkValidationError[] = [];

  if (!isValidThoughtContent(request.conclusion)) {
    errors.push({
      field: 'conclusion',
      message: 'conclusion is required and must be a non-empty string',
    });
  }

  if (request.documentId !== undefined && !isValidThinkId(request.documentId as string)) {
    errors.push({
      field: 'documentId',
      message: 'documentId must be a valid think document ID (think-YYYYMMDD-HHMMSS)',
    });
  }

  if (request.promote !== undefined && !isValidPromotionType(request.promote)) {
    errors.push({
      field: 'promote',
      message: `promote must be one of: ${MemoryType.Decision}, ${MemoryType.Learning}, ${MemoryType.Artifact}, ${MemoryType.Gotcha}`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a ThinkUseRequest
 */
export function validateThinkUse(request: {
  documentId?: unknown;
}): ThinkValidationResult {
  const errors: ThinkValidationError[] = [];

  if (!request.documentId || !isValidThinkId(request.documentId as string)) {
    errors.push({
      field: 'documentId',
      message: 'documentId is required and must be a valid think document ID',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a ThinkDeleteRequest
 */
export function validateThinkDelete(request: {
  documentId?: unknown;
}): ThinkValidationResult {
  const errors: ThinkValidationError[] = [];

  if (!request.documentId || !isValidThinkId(request.documentId as string)) {
    errors.push({
      field: 'documentId',
      message: 'documentId is required and must be a valid think document ID',
    });
  }

  return { valid: errors.length === 0, errors };
}
