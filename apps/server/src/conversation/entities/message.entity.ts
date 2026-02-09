import type { Message, AgentType, CodeBlock } from '@duet/shared';

export class MessageEntity implements Message {
  id: string;
  role: 'user' | AgentType;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];

  constructor(params: {
    id: string;
    role: 'user' | AgentType;
    content: string;
    timestamp?: number;
    isStreaming?: boolean;
    codeBlocks?: CodeBlock[];
  }) {
    this.id = params.id;
    this.role = params.role;
    this.content = params.content;
    this.timestamp = params.timestamp ?? Date.now();
    this.isStreaming = params.isStreaming;
    this.codeBlocks = params.codeBlocks;
  }
}
