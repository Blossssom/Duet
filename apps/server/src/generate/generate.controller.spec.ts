import { Test, TestingModule } from '@nestjs/testing';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import type { StreamChunk } from '@duet/shared';

async function* mockStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function textChunk(content: string): StreamChunk {
  return { source: 'gemini', content, timestamp: Date.now(), type: 'text' };
}

describe('GenerateController', () => {
  let controller: GenerateController;
  let generateService: { generate: jest.Mock };
  let mockRes: {
    setHeader: jest.Mock;
    flushHeaders: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
  };
  const originalStderrWrite = process.stderr.write;

  beforeAll(() => {
    process.stderr.write = jest.fn() as any;
  });

  afterAll(() => {
    process.stderr.write = originalStderrWrite;
  });

  beforeEach(async () => {
    generateService = {
      generate: jest.fn(),
    };

    mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [{ provide: GenerateService, useValue: generateService }],
    }).compile();

    controller = module.get<GenerateController>(GenerateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should set SSE headers and flush them', async () => {
    generateService.generate.mockReturnValue(mockStream([]));

    await controller.generate({ prompt: 'test' }, mockRes as any);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(mockRes.flushHeaders).toHaveBeenCalled();
  });

  it('should write chunks as SSE data lines', async () => {
    const chunk1 = textChunk('Hello ');
    const chunk2 = textChunk('World');
    generateService.generate.mockReturnValue(mockStream([chunk1, chunk2]));

    await controller.generate({ prompt: 'test' }, mockRes as any);

    expect(mockRes.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify(chunk1)}\n\n`,
    );
    expect(mockRes.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify(chunk2)}\n\n`,
    );
  });

  it('should send done event after all chunks', async () => {
    const chunk = textChunk('data');
    generateService.generate.mockReturnValue(mockStream([chunk]));

    await controller.generate({ prompt: 'test' }, mockRes as any);

    const writeCalls = mockRes.write.mock.calls.map(
      (call: [string]) => call[0],
    );
    expect(writeCalls).toEqual([
      `data: ${JSON.stringify(chunk)}\n\n`,
      'event: done\ndata: {}\n\n',
    ]);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should call res.end() on success', async () => {
    generateService.generate.mockReturnValue(mockStream([]));

    await controller.generate({ prompt: 'test' }, mockRes as any);

    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should call res.end() even when generate throws', async () => {
    generateService.generate.mockReturnValue(
      (async function* () {
        throw new Error('CLI failed');
      })(),
    );

    await controller.generate({ prompt: 'test' }, mockRes as any);

    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should write error event when generate throws', async () => {
    generateService.generate.mockReturnValue(
      (async function* () {
        throw new Error('CLI failed');
      })(),
    );

    await controller.generate({ prompt: 'test' }, mockRes as any);

    const writeCalls = mockRes.write.mock.calls.map(
      (call: [string]) => call[0],
    );
    const errorWrite = writeCalls.find((w: string) =>
      w.startsWith('event: error'),
    );
    expect(errorWrite).toBeDefined();

    const dataLine = errorWrite!.split('\n')[1];
    const payload = JSON.parse(dataLine.replace('data: ', ''));
    expect(payload.content).toBe('CLI failed');
    expect(payload.type).toBe('error');
  });

  it('should extract skipReview from DTO options', async () => {
    generateService.generate.mockReturnValue(mockStream([]));

    await controller.generate(
      { prompt: 'test', options: { skipReview: true } },
      mockRes as any,
    );
    expect(generateService.generate).toHaveBeenCalledWith('test', true);

    generateService.generate.mockClear();
    generateService.generate.mockReturnValue(mockStream([]));

    await controller.generate({ prompt: 'test' }, mockRes as any);
    expect(generateService.generate).toHaveBeenCalledWith('test', false);
  });
});
