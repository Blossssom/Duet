import { Test, TestingModule } from '@nestjs/testing';
import { GenerateService } from './generate.service';
import { CliService } from '../cli/cli.service';
import { ConversationService } from '../conversation/conversation.service';
import type { StreamChunk, AgentType } from '@duet/shared';

async function* mockStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function textChunk(source: AgentType, content: string): StreamChunk {
  return { source, content, timestamp: Date.now(), type: 'text' };
}

function errorChunk(source: AgentType, content: string): StreamChunk {
  return { source, content, timestamp: Date.now(), type: 'error' };
}

describe('GenerateService', () => {
  let service: GenerateService;
  let cliService: { execute: jest.Mock };
  let conversationService: {
    createConversation: jest.Mock;
    addMessage: jest.Mock;
    getMessages: jest.Mock;
  };

  beforeEach(async () => {
    cliService = {
      execute: jest.fn(),
    };

    conversationService = {
      createConversation: jest.fn().mockReturnValue({ id: 'conv-1' }),
      addMessage: jest.fn(),
      getMessages: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateService,
        { provide: CliService, useValue: cliService },
        { provide: ConversationService, useValue: conversationService },
      ],
    }).compile();

    service = module.get<GenerateService>(GenerateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate', () => {
    it('should yield Gemini chunks when skipReview is true', async () => {
      const geminiChunks = [
        textChunk('gemini', 'Hello '),
        textChunk('gemini', 'World'),
      ];
      cliService.execute.mockReturnValue(mockStream(geminiChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt', true)) {
        result.push(chunk);
      }

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hello ');
      expect(result[1].content).toBe('World');
      expect(result.every((c) => c.source === 'gemini')).toBe(true);
    });

    it('should yield Gemini chunks then Claude review chunk in full flow', async () => {
      const geminiChunks = [textChunk('gemini', '```ts\nconst x = 1;\n```')];
      const claudeChunks = [textChunk('claude', 'Looks good!')];

      cliService.execute
        .mockReturnValueOnce(mockStream(geminiChunks))
        .mockReturnValueOnce(mockStream(claudeChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt')) {
        result.push(chunk);
      }

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('gemini');
      expect(result[0].content).toContain('const x = 1');
      expect(result[1].source).toBe('claude');
      expect(result[1].content).toBe('Looks good!');
    });

    it('should skip Claude when skipReview is true', async () => {
      const geminiChunks = [textChunk('gemini', 'some output')];
      cliService.execute.mockReturnValue(mockStream(geminiChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt', true)) {
        result.push(chunk);
      }

      expect(result).toHaveLength(1);
      expect(cliService.execute).toHaveBeenCalledTimes(1);
      expect(cliService.execute).toHaveBeenCalledWith('gemini', 'test prompt');
      expect(cliService.execute).not.toHaveBeenCalledWith(
        'claude',
        expect.anything(),
      );
    });

    it('should pass extracted code to Claude review prompt', async () => {
      const code = 'const x = 1;';
      const geminiChunks = [
        textChunk('gemini', `Here is code:\n\`\`\`ts\n${code}\n\`\`\``),
      ];
      const claudeChunks = [textChunk('claude', 'LGTM')];

      cliService.execute
        .mockReturnValueOnce(mockStream(geminiChunks))
        .mockReturnValueOnce(mockStream(claudeChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt')) {
        result.push(chunk);
      }

      const claudeCall = cliService.execute.mock.calls.find(
        (call: [AgentType, string]) => call[0] === 'claude',
      );
      expect(claudeCall).toBeDefined();
      const claudePrompt = claudeCall![1] as string;
      expect(claudePrompt).toContain('Review the following code');
      expect(claudePrompt).toContain(code);
    });

    it('should use general feedback prompt when no code block is present', async () => {
      const plainText = 'This is just plain text with no code fences.';
      const geminiChunks = [textChunk('gemini', plainText)];
      const claudeChunks = [textChunk('claude', 'Feedback here')];

      cliService.execute
        .mockReturnValueOnce(mockStream(geminiChunks))
        .mockReturnValueOnce(mockStream(claudeChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt')) {
        result.push(chunk);
      }

      const claudeCall = cliService.execute.mock.calls.find(
        (call: [AgentType, string]) => call[0] === 'claude',
      );
      expect(claudeCall).toBeDefined();
      const claudePrompt = claudeCall![1] as string;
      expect(claudePrompt).toContain(
        'Review the following output and provide feedback',
      );
      expect(claudePrompt).toContain(plainText);
    });

    it('should save user prompt, gemini output, and claude output as messages', async () => {
      const geminiChunks = [textChunk('gemini', 'generated code')];
      const claudeChunks = [textChunk('claude', 'review feedback')];

      cliService.execute
        .mockReturnValueOnce(mockStream(geminiChunks))
        .mockReturnValueOnce(mockStream(claudeChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('build a form')) {
        result.push(chunk);
      }

      expect(conversationService.createConversation).toHaveBeenCalledTimes(1);
      expect(conversationService.addMessage).toHaveBeenCalledTimes(3);
      expect(conversationService.addMessage).toHaveBeenNthCalledWith(
        1,
        'conv-1',
        'user',
        'build a form',
      );
      expect(conversationService.addMessage).toHaveBeenNthCalledWith(
        2,
        'conv-1',
        'gemini',
        'generated code',
      );
      expect(conversationService.addMessage).toHaveBeenNthCalledWith(
        3,
        'conv-1',
        'claude',
        'review feedback',
      );
    });

    it('should only save user and gemini messages when skipReview is true', async () => {
      const geminiChunks = [textChunk('gemini', 'output')];
      cliService.execute.mockReturnValue(mockStream(geminiChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test', true)) {
        result.push(chunk);
      }

      expect(conversationService.addMessage).toHaveBeenCalledTimes(2);
      expect(conversationService.addMessage).toHaveBeenNthCalledWith(
        1,
        'conv-1',
        'user',
        'test',
      );
      expect(conversationService.addMessage).toHaveBeenNthCalledWith(
        2,
        'conv-1',
        'gemini',
        'output',
      );
    });

    it('should exclude error chunk content from text passed to Claude', async () => {
      const geminiChunks = [
        textChunk('gemini', 'good text '),
        errorChunk('gemini', 'stderr noise'),
        textChunk('gemini', 'more good text'),
      ];
      const claudeChunks = [textChunk('claude', 'review')];

      cliService.execute
        .mockReturnValueOnce(mockStream(geminiChunks))
        .mockReturnValueOnce(mockStream(claudeChunks));

      const result: StreamChunk[] = [];
      for await (const chunk of service.generate('test prompt')) {
        result.push(chunk);
      }

      const claudeCall = cliService.execute.mock.calls.find(
        (call: [AgentType, string]) => call[0] === 'claude',
      );
      expect(claudeCall).toBeDefined();
      const claudePrompt = claudeCall![1] as string;
      expect(claudePrompt).toContain('good text');
      expect(claudePrompt).toContain('more good text');
      expect(claudePrompt).not.toContain('stderr noise');
    });
  });
});
