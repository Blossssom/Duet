import { Controller, Post, Body, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { GenerateService } from './generate.service';
import { GenerateDto } from './dto/generate.dto';

@Controller('api/generate')
export class GenerateController {
  private readonly logger = new Logger(GenerateController.name);

  constructor(private readonly generateService: GenerateService) {}

  @Post()
  async generate(
    @Body() generateDto: GenerateDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const skipReview = generateDto.options?.skipReview ?? false;

      for await (const chunk of this.generateService.generate(
        generateDto.prompt,
        skipReview,
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
    } catch (error) {
      this.logger.error('Generation failed', error);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          source: 'gemini',
          content: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
          type: 'error',
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
