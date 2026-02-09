import type { AgentType } from './agent';

export interface Message {
  id: string;
  role: 'user' | AgentType;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}
