/**
 * Heuristic keyword matching for auto-selection fallback
 * Maps thought content keywords to appropriate styles
 */

export interface HeuristicMatch {
  style: string;
  confidence: number;
  matchedKeywords: string[];
}

interface HeuristicRule {
  style: string;
  keywords: string[];
  weight: number;
}

export const HEURISTIC_RULES: HeuristicRule[] = [
  {
    style: 'Devils-Advocate',
    keywords: ['security', 'vulnerability', 'risk', 'attack', 'injection', 'exploit', 'threat', 'danger', 'unsafe'],
    weight: 1.0,
  },
  {
    style: 'Socratic',
    keywords: ['design', 'architecture', 'pattern', 'structure', 'approach', 'strategy', 'how should', 'best way'],
    weight: 0.9,
  },
  {
    style: 'Comparative',
    keywords: ['compare', 'versus', 'vs', 'tradeoff', 'trade-off', 'pros and cons', 'alternative', 'difference'],
    weight: 0.9,
  },
  {
    style: 'Concise',
    keywords: ['summary', 'summarise', 'summarize', 'brief', 'tldr', 'key points', 'overview'],
    weight: 0.8,
  },
  {
    style: 'ELI5',
    keywords: ['explain', 'what is', 'how does', 'understand', 'simple', 'basics', 'beginner'],
    weight: 0.7,
  },
];

/**
 * Match thought content against heuristic rules
 * @param thought - The thought content to analyse
 * @param avoidStyles - Styles to exclude from matching
 * @returns Best matching style or null if no match
 */
export function matchHeuristics(thought: string, avoidStyles: string[] = []): HeuristicMatch | null {
  const lowerThought = thought.toLowerCase();
  const avoidSet = new Set(avoidStyles);

  let bestMatch: HeuristicMatch | null = null;

  for (const rule of HEURISTIC_RULES) {
    if (avoidSet.has(rule.style)) continue;

    const matched: string[] = [];
    for (const keyword of rule.keywords) {
      if (lowerThought.includes(keyword.toLowerCase())) {
        matched.push(keyword);
      }
    }

    if (matched.length === 0) continue;

    // Confidence based on matched keywords and rule weight
    const confidence = Math.min(1.0, (matched.length / 3) * rule.weight);

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        style: rule.style,
        confidence,
        matchedKeywords: matched,
      };
    }
  }

  return bestMatch;
}
