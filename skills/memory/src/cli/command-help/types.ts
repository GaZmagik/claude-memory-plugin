/**
 * Command help entry with structured information
 */
export interface CommandHelpEntry {
  usage: string;
  description: string;
  arguments?: string;
  flags?: string;
  examples?: string[];
  subcommands?: string;
  notes?: string;
}
