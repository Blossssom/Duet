import { Injectable, Logger } from '@nestjs/common';
import { CliService } from '../cli/cli.service';
import type { StreamChunk } from '@duet/shared';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);

  constructor(private readonly cliService: CliService) {}

  async *generate(
    prompt: string,
    skipReview = false,
  ): AsyncGenerator<StreamChunk> {
    this.logger.log(
      `Starting generation for prompt: ${prompt.slice(0, 50)}...`,
    );

    // Run Gemini
    yield* this.runGemini(prompt);

    // TODO: Run Claude review (Step 3.6)
    if (!skipReview) {
      this.logger.debug('Claude review will be implemented in Step 3.6');
    }
  }

  private async *runGemini(prompt: string): AsyncGenerator<StreamChunk> {
    this.logger.debug('Running Gemini CLI');
    yield* this.cliService.execute('gemini', prompt);
  }
}
