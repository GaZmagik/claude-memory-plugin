/**
 * Ollama-based style/agent selection
 */

import { sanitiseForPrompt } from './sanitise.js';

export function buildSelectionPrompt(
  thought: string,
  availableStyles: string[],
  availableAgents: string[],
  avoidStyles: string[]
): string {
  const sanitised = sanitiseForPrompt(thought, 500);
  const avoidSet = new Set(avoidStyles);
  const filteredStyles = availableStyles.filter((s) => !avoidSet.has(s));

  const stylesSection = filteredStyles.length > 0
    ? `Available styles: ${filteredStyles.join(', ')}`
    : 'No styles available';

  const agentsSection = availableAgents.length > 0
    ? `Available agents: ${availableAgents.join(', ')}`
    : '';

  const rules: string[] = [];
  if (!avoidSet.has('Devils-Advocate') && filteredStyles.includes('Devils-Advocate')) {
    rules.push('- Security/risk topics: Devils-Advocate');
  }
  if (!avoidSet.has('Socratic') && filteredStyles.includes('Socratic')) {
    rules.push('- Design/architecture: Socratic');
  }
  if (!avoidSet.has('Comparative') && filteredStyles.includes('Comparative')) {
    rules.push('- Comparisons: Comparative');
  }
  if (!avoidSet.has('Concise') && filteredStyles.includes('Concise')) {
    rules.push('- Summaries: Concise');
  }
  if (!avoidSet.has('ELI5') && filteredStyles.includes('ELI5')) {
    rules.push('- Explanations: ELI5');
  }
  const rulesSection = rules.length > 0 ? `Rules:\n${rules.join('\n')}` : '';

  return `Select output style for thinking session.

Thought: "${sanitised}"

${stylesSection}
${agentsSection}

${rulesSection}

Respond with JSON: {"style": "<name>", "reason": "<brief>"}`;
}

export interface OllamaSelectionResult {
  style?: string;
  agent?: string;
  reason: string;
}

export function parseSelectionResponse(response: string): OllamaSelectionResult | null {
  try {
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.style && !parsed.agent) return null;
    return { style: parsed.style, agent: parsed.agent, reason: parsed.reason || 'No reason' };
  } catch {
    return null;
  }
}
