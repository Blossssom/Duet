import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { CliService } from '../../src/cli/cli.service';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import type { StreamChunk } from '@duet/shared';

export class MockCliService {
  private chunks: StreamChunk[] = [];

  setChunks(chunks: StreamChunk[]): void {
    this.chunks = chunks;
  }

  async *execute(): AsyncGenerator<StreamChunk> {
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

export function createMockChunk(
  source: 'gemini' | 'claude',
  content: string,
): StreamChunk {
  return {
    source,
    content,
    timestamp: Date.now(),
    type: 'text',
  };
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
  mockCliService: MockCliService;
}> {
  const mockCliService = new MockCliService();

  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CliService)
    .useValue(mockCliService)
    .compile();

  const app = module.createNestApplication();

  // Apply the same global config as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.init();

  return { app, module, mockCliService };
}
