import { Injectable, Logger } from '@nestjs/common';
import { CliService } from '../cli/cli.service';
import type { StreamChunk } from '@duet/shared';
import { extractFirstCode } from '../common/utils/code-parser.util';
import { ConversationService } from '../conversation/conversation.service';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(
    private readonly cliService: CliService,
    private readonly conversationService: ConversationService,
  ) {}

  async *generate(
    prompt: string,
    skipReview = false,
  ): AsyncGenerator<StreamChunk> {
    this.logger.log(
      `Starting generation for prompt: ${prompt.slice(0, 50)}...`,
    );

    // Create conversation and save user prompt
    const conversation = this.conversationService.createConversation();
    this.conversationService.addMessage(conversation.id, 'user', prompt);

    // Run Gemini and accumulate output
    const geminiOutput = await this.runGemini(prompt);

    // Yield accumulated chunks to controller
    for (const chunk of geminiOutput.chunks) {
      yield chunk;
    }

    // Save Gemini output as message
    this.conversationService.addMessage(
      conversation.id,
      'gemini',
      geminiOutput.fullText,
    );

    this.logger.debug(
      `Gemini finished. Accumulated ${geminiOutput.fullText.length} chars`,
    );

    // Run Claude review
    if (!skipReview) {
      const claudeOutput = await this.runClaude(geminiOutput.fullText);

      for (const chunk of claudeOutput.chunks) {
        yield chunk;
      }

      // Save Claude output as message
      this.conversationService.addMessage(
        conversation.id,
        'claude',
        claudeOutput.fullText,
      );
    }
  }

  private async runGemini(
    prompt: string,
  ): Promise<{ chunks: StreamChunk[]; fullText: string }> {
    this.logger.debug('Running Gemini CLI');

    const chunks: StreamChunk[] = [];
    const textParts: string[] = [];

    for await (const chunk of this.cliService.execute('gemini', prompt)) {
      chunks.push(chunk);
      if (chunk.type !== 'error') {
        textParts.push(chunk.content);
      }
    }

    return { chunks, fullText: textParts.join('') };
  }

  private async runClaude(
    geminiOutput: string,
  ): Promise<{ chunks: StreamChunk[]; fullText: string }> {
    this.logger.debug('Running Claude CLI for review');

    const code = extractFirstCode(geminiOutput);
    const reviewPrompt = code
      ? `Review the following code and suggest improvements:\n\n${code}`
      : `Review the following output and provide feedback:\n\n${geminiOutput}`;

    const chunks: StreamChunk[] = [];
    const textParts: string[] = [];

    for await (const chunk of this.cliService.execute('claude', reviewPrompt)) {
      chunks.push(chunk);
      if (chunk.type !== 'error') {
        textParts.push(chunk.content);
      }
    }

    return { chunks, fullText: textParts.join('') };
  }
}
