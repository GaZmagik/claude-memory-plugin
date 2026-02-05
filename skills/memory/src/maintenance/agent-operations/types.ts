/**
 * Type definitions for agent operations
 */

import type { Scope } from '../../types/enums.js';

/**
 * Base request for all agent operations
 */
export interface BaseAgentRequest {
  scope: Scope;
  projectRoot: string;
  globalRoot: string;
  dryRun?: boolean;
}

/**
 * Request to create a new agent
 */
export interface CreateAgentRequest extends BaseAgentRequest {
  name: string;
}

/**
 * Response from agent creation
 */
export interface CreateAgentResponse {
  status: 'success';
  agent: {
    name: string;
    scope: Scope;
    path: string;
  };
  dryRun: boolean;
}

/**
 * Confirmation callback for destructive operations
 */
export type ConfirmationCallback = (agentName: string, memoryCount: number) => Promise<boolean>;

/**
 * Request to delete an agent
 */
export interface DeleteAgentRequest extends BaseAgentRequest {
  name: string;
  force?: boolean;
  confirmationCallback?: ConfirmationCallback;
}

/**
 * Response from agent deletion
 */
export interface DeleteAgentResponse {
  status: 'success' | 'cancelled';
  agent?: string;
  memoriesDeleted?: number;
  deleted?: string[];
  dryRun?: boolean;
}

/**
 * Request to copy an agent
 */
export interface CopyAgentRequest extends BaseAgentRequest {
  source: string;
  target: string;
  force?: boolean;
}

/**
 * Response from agent copying
 */
export interface CopyAgentResponse {
  status: 'success';
  source: string;
  target: string;
  memoriesCopied: number;
  dryRun: boolean;
}

/**
 * Request to rename an agent
 */
export interface RenameAgentRequest extends BaseAgentRequest {
  oldName: string;
  newName: string;
}

/**
 * Response from agent renaming
 */
export interface RenameAgentResponse {
  status: 'success';
  oldName: string;
  newName: string;
  memoriesUpdated: number;
  dryRun: boolean;
}
