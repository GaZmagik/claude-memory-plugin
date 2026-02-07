/**
 * Interactive confirmation utilities for destructive operations
 */

import prompts from 'prompts';

/**
 * Confirm deletion of an agent with its memories
 *
 * @param agentName - Name of the agent to delete
 * @param memoryCount - Number of memories that will be deleted
 * @returns true if user confirms, false otherwise
 */
export async function confirmDeletion(agentName: string, memoryCount: number): Promise<boolean> {
  const memoryText = memoryCount === 1 ? '1 memory' : `${memoryCount} memories`;

  const response = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: `Delete agent "${agentName}" and ${memoryText}? This cannot be undone.`,
    initial: false,
  });

  // Handle cancellation (Ctrl+C or undefined response)
  if (response.confirmed === undefined) {
    return false;
  }

  return response.confirmed === true;
}

/**
 * Check if confirmation is needed based on flags
 *
 * @param force - Whether --force flag was provided
 * @param dryRun - Whether --dry-run flag was provided
 * @returns true if confirmation prompt should be shown
 */
export function shouldConfirm(force: boolean, dryRun: boolean): boolean {
  // Skip confirmation if --force or --dry-run
  return !force && !dryRun;
}
