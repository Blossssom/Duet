import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { GenerateService } from './generate.service';
import { GenerateDto } from './dto/generate.dto';

@Controller('api/generate')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post()
  generate(@Body() generateDto: GenerateDto, @Res() res: Response): void {
    // TODO: Implement SSE streaming (Step 3.3)
    res.json({
      message: 'Generate endpoint placeholder',
      prompt: generateDto.prompt,
    });
  }
}
