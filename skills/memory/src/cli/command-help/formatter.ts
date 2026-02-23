import type { CommandHelpEntry } from './types.js';

/**
 * Format a CommandHelpEntry into displayable text
 */
export function formatCommandHelp(command: string, help: CommandHelpEntry): string {
  const lines: string[] = [];

  lines.push(`memory ${command} - ${help.description}`);
  lines.push('');
  lines.push('USAGE:');
  lines.push(`  ${help.usage}`);

  if (help.arguments) {
    lines.push('');
    lines.push('ARGUMENTS:');
    lines.push(help.arguments);
  }

  if (help.flags) {
    lines.push('');
    lines.push('FLAGS:');
    lines.push(help.flags);
  }

  if (help.subcommands) {
    lines.push('');
    lines.push('SUBCOMMANDS:');
    lines.push(help.subcommands);
  }

  if (help.examples && help.examples.length > 0) {
    lines.push('');
    lines.push('EXAMPLES:');
    for (const example of help.examples) {
      lines.push(`  ${example}`);
    }
  }

  if (help.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(help.notes);
  }

  return lines.join('\n');
}

/**
 * Format discovered files into a display list
 */
export function formatDiscoveredList(
  items: Array<{ name: string; source: string; description?: string }>
): string {
  if (items.length === 0) {
    return '    (none found)';
  }
  return items
    .map((item) => {
      const desc = item.description ? ` - ${item.description}` : '';
      return `    ${item.name} (${item.source})${desc}`;
    })
    .join('\n');
}
