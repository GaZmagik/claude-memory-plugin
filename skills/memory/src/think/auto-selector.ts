/**
 * Auto-selector with tiered strategy: Ollama → Heuristics → Default
 */

import { matchHeuristics } from './heuristics.js';
import { buildSelectionPrompt, parseSelectionResponse } from './ollama-selector.js';
import { validateSelection } from './validate-selection.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { sanitiseForPrompt } from './sanitise.js';

export interface AutoSelectionResult {
  style?: string;
  agent?: string;
  reason: string;
  source: 'ollama' | 'heuristics' | 'default';
  confidence?: number;
}

export interface AutoSelectorConfig {
  ollamaTimeout: number;
  defaultStyle: string;
  circuitBreaker: CircuitBreaker;
  generateFn?: (prompt: string) => Promise<string>;
}

export class AutoSelector {
  private config: AutoSelectorConfig;
  private availableStyles: string[] = [];
  private availableAgents: string[] = [];

  constructor(config: AutoSelectorConfig) {
    this.config = config;
  }

  setAvailable(styles: string[], agents: string[]): void {
    this.availableStyles = styles;
    this.availableAgents = agents;
  }

  async select(thought: string, avoidStyles: string[] = []): Promise<AutoSelectionResult> {
    const sanitised = sanitiseForPrompt(thought);

    // Tier 1: Try Ollama if circuit breaker allows
    if (this.config.circuitBreaker.canExecute() && this.config.generateFn) {
      try {
        const result = await this.tryOllama(sanitised, avoidStyles);
        if (result) {
          this.config.circuitBreaker.recordSuccess();
          return result;
        }
      } catch {
        this.config.circuitBreaker.recordFailure();
      }
    }

    // Tier 2: Fall back to heuristics
    const heuristicResult = this.tryHeuristics(sanitised, avoidStyles);
    if (heuristicResult) return heuristicResult;

    // Tier 3: Default style
    return { style: this.config.defaultStyle, reason: 'Using default', source: 'default' };
  }

  private async tryOllama(thought: string, avoidStyles: string[]): Promise<AutoSelectionResult | null> {
    if (!this.config.generateFn) return null;

    const prompt = buildSelectionPrompt(thought, this.availableStyles, this.availableAgents, avoidStyles);
    const response = await Promise.race([
      this.config.generateFn(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), this.config.ollamaTimeout)),
    ]);

    const parsed = parseSelectionResponse(response);
    if (!parsed) return null;

    const validation = validateSelection(parsed, this.availableStyles, this.availableAgents);
    if (!validation.valid) return null;

    return { style: validation.style, agent: validation.agent, reason: parsed.reason, source: 'ollama' };
  }

  private tryHeuristics(thought: string, avoidStyles: string[]): AutoSelectionResult | null {
    const match = matchHeuristics(thought, avoidStyles);
    if (!match || !this.availableStyles.includes(match.style)) return null;

    return {
      style: match.style,
      reason: `Matched: ${match.matchedKeywords.join(', ')}`,
      source: 'heuristics',
      confidence: match.confidence,
    };
  }
}
