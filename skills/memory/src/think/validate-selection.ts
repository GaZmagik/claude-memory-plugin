/**
 * Selection validation against discovery whitelist
 */

export interface SelectionResult {
  style?: string;
  agent?: string;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  style?: string;
  agent?: string;
  reason?: string;
  error?: string;
}

export function validateSelection(
  selection: SelectionResult,
  availableStyles: string[],
  availableAgents: string[]
): ValidationResult {
  const { style, agent, reason } = selection;

  if (!style && !agent) {
    return { valid: false, error: 'Selection must include style or agent' };
  }

  if (style && !availableStyles.includes(style)) {
    return { valid: false, error: `Unknown style: ${style}` };
  }

  if (agent && !availableAgents.includes(agent)) {
    return { valid: false, error: `Unknown agent: ${agent}` };
  }

  return { valid: true, style, agent, reason };
}
