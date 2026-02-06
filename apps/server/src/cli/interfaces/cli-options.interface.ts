import type { AgentType } from '@duet/shared';

export interface CliOptions {
  cwd?: string;
  timeout?: number;
}

export interface CliExecuteOptions extends CliOptions {
  agent: AgentType;
  prompt: string;
}
