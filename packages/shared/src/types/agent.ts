export type AgentType = 'gemini' | 'claude';

export interface StreamChunk {
  source: AgentType;
  content: string;
  timestamp: number;
  type: 'thinking' | 'code' | 'text' | 'error';
}

export interface GenerateRequest {
  prompt: string;
  options?: {
    skipReview?: boolean;
  };
}

export interface GenerateResult {
  id: string;
  prompt: string;
  geminiOutput: string;
  claudeReview: string;
  finalCode: string;
  timestamp: number;
}
