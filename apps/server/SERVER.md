# SERVER.md

> Backend development guidelines for Duet server

---

## Overview

NestJS-based backend providing SSE streaming for AI code generation workflow. Executes Gemini and Claude CLI via child_process and streams their output to the client.

---

## Tech Stack

| Technology           | Version | Purpose                          |
| -------------------- | ------- | -------------------------------- |
| NestJS               | 10.x    | Framework                        |
| TypeScript           | 5.x     | Type safety                      |
| child_process        | -       | CLI execution (Node.js built-in) |
| @nestjs/config       | 3.x     | Configuration                    |
| @nestjs/serve-static | 4.x     | Static file serving              |
| Jest                 | 29.x    | Test runner                      |
| Supertest            | 6.x     | E2E testing                      |

### Removed (No longer needed)

| Technology    | Reason                               |
| ------------- | ------------------------------------ |
| ~~node-pty~~  | child_process.spawn is sufficient    |
| ~~Socket.io~~ | SSE is simpler for one-way streaming |

---

## Project Structure

```
server/
├── src/
│   ├── generate/                   # Generate Module (main feature)
│   │   ├── generate.module.ts
│   │   ├── generate.controller.ts  # SSE endpoint
│   │   ├── generate.controller.spec.ts
│   │   ├── generate.service.ts     # Orchestration
│   │   ├── generate.service.spec.ts
│   │   └── dto/
│   │       ├── generate.dto.ts
│   │       └── index.ts
│   │
│   ├── cli/                        # CLI Module
│   │   ├── cli.module.ts
│   │   ├── cli.service.ts          # CLI execution
│   │   ├── cli.service.spec.ts
│   │   └── interfaces/
│   │       ├── cli-options.interface.ts
│   │       └── index.ts
│   │
│   ├── conversation/               # Conversation Module
│   │   ├── conversation.module.ts
│   │   ├── conversation.service.ts
│   │   ├── conversation.service.spec.ts
│   │   └── entities/
│   │       ├── message.entity.ts
│   │       └── conversation.entity.ts
│   │
│   ├── common/                     # Shared utilities
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── utils/
│   │       ├── code-parser.util.ts
│   │       └── code-parser.util.spec.ts
│   │
│   ├── config/                     # Configuration
│   │   ├── config.module.ts
│   │   ├── app.config.ts
│   │   └── cli.config.ts
│   │
│   ├── app.module.ts               # Root module
│   ├── app.controller.ts           # Health check
│   └── main.ts                     # Entry point
│
├── test/                           # E2E tests
│   ├── generate.e2e-spec.ts
│   └── jest-e2e.json
│
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
└── package.json
```

---

## Module Structure

### Standard Module Pattern

```
module-name/
├── module-name.module.ts       # Module definition
├── module-name.controller.ts   # HTTP endpoints
├── module-name.service.ts      # Business logic
├── module-name.service.spec.ts # Unit tests
├── dto/                        # Data Transfer Objects
│   ├── create-*.dto.ts
│   └── index.ts
├── entities/                   # Data entities (if needed)
│   └── *.entity.ts
└── interfaces/                 # TypeScript interfaces
    └── *.interface.ts
```

---

## SSE Implementation

### Controller (SSE Endpoint)

```typescript
// generate/generate.controller.ts
import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { GenerateService } from './generate.service';
import { GenerateDto } from './dto/generate.dto';
import type { StreamChunk } from '@duet/shared';

@Controller('api')
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateDto, @Res() res: Response) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Helper to send SSE event
    const sendEvent = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Stream Gemini output
      for await (const chunk of this.generateService.runGemini(dto.prompt)) {
        sendEvent(chunk);
      }

      // Stream Claude review
      const code = this.generateService.getLastCode();
      for await (const chunk of this.generateService.runClaude(code)) {
        sendEvent(chunk);
      }

      sendEvent({ type: 'done' });
    } catch (error) {
      sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      res.end();
    }
  }
}
```

### Service (Orchestration)

```typescript
// generate/generate.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CliService } from '../cli/cli.service';
import { ConversationService } from '../conversation/conversation.service';
import { parseCodeBlocks } from '../common/utils/code-parser.util';
import type { StreamChunk } from '@duet/shared';

@Injectable()
export class GenerateService {
  private readonly logger = new Logger(GenerateService.name);
  private lastGeminiOutput = '';
  private lastCode = '';

  constructor(
    private readonly cliService: CliService,
    private readonly conversationService: ConversationService,
  ) {}

  async *runGemini(prompt: string): AsyncGenerator<StreamChunk> {
    this.logger.log(`Running Gemini with prompt: ${prompt.slice(0, 50)}...`);
    this.lastGeminiOutput = '';

    for await (const chunk of this.cliService.execute('gemini', prompt)) {
      this.lastGeminiOutput += chunk.content;
      yield chunk;
    }

    // Parse code from output
    const codeBlocks = parseCodeBlocks(this.lastGeminiOutput);
    this.lastCode = codeBlocks[0]?.code || this.lastGeminiOutput;

    // Save to conversation history
    await this.conversationService.addMessage({
      role: 'gemini',
      content: this.lastGeminiOutput,
    });
  }

  async *runClaude(code: string): AsyncGenerator<StreamChunk> {
    const reviewPrompt = this.buildReviewPrompt(code);
    this.logger.log('Running Claude for code review');

    for await (const chunk of this.cliService.execute('claude', reviewPrompt)) {
      yield chunk;
    }
  }

  getLastCode(): string {
    return this.lastCode;
  }

  private buildReviewPrompt(code: string): string {
    return `다음 코드를 검토해주세요. 보안 이슈, 버그, 개선점을 찾아주세요.

\`\`\`
${code}
\`\`\`

검토 후 수정된 코드도 제공해주세요.`;
  }
}
```

### CLI Service (child_process)

```typescript
// cli/cli.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import type { AgentType, StreamChunk } from '@duet/shared';

@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(private readonly configService: ConfigService) {}

  async *execute(
    agent: AgentType,
    prompt: string,
  ): AsyncGenerator<StreamChunk> {
    const command = this.getCommand(agent);
    const args = this.getArgs(agent, prompt);
    const cwd = this.configService.get<string>('WORKSPACE_DIR', process.cwd());

    this.logger.log(`Executing: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env },
    });

    yield* this.streamOutput(child, agent);
  }

  private async *streamOutput(
    child: ChildProcess,
    agent: AgentType,
  ): AsyncGenerator<StreamChunk> {
    const createChunk = (
      content: string,
      type: StreamChunk['type'],
    ): StreamChunk => ({
      source: agent,
      content,
      timestamp: Date.now(),
      type,
    });

    // Stream stdout
    if (child.stdout) {
      for await (const data of child.stdout) {
        yield createChunk(data.toString(), 'text');
      }
    }

    // Stream stderr (as error type)
    if (child.stderr) {
      for await (const data of child.stderr) {
        const content = data.toString();
        // Some CLIs use stderr for progress, not just errors
        yield createChunk(
          content,
          content.toLowerCase().includes('error') ? 'error' : 'text',
        );
      }
    }

    // Wait for process to exit
    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          this.logger.warn(`${agent} exited with code ${code}`);
          resolve(); // Don't reject, just log
        }
      });
      child.on('error', reject);
    });
  }

  private getCommand(agent: AgentType): string {
    return agent === 'gemini'
      ? this.configService.get('GEMINI_CLI', 'gemini')
      : this.configService.get('CLAUDE_CLI', 'claude');
  }

  private getArgs(agent: AgentType, prompt: string): string[] {
    // Adjust based on actual CLI interface
    // This may need customization based on how gemini/claude CLI accepts input
    return [prompt];
  }
}
```

---

## DTO Pattern

```typescript
// generate/dto/generate.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsBoolean()
  skipReview?: boolean;
}
```

---

## Code Parser Utility

````typescript
// common/utils/code-parser.util.ts
export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export function parseCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
    });
  }

  return blocks;
}

export function extractFirstCode(content: string): string | null {
  const blocks = parseCodeBlocks(content);
  return blocks[0]?.code || null;
}
````

````typescript
// common/utils/code-parser.util.spec.ts
import { parseCodeBlocks, extractFirstCode } from './code-parser.util';

describe('code-parser', () => {
  describe('parseCodeBlocks', () => {
    it('should parse code blocks with language', () => {
      const content = '```typescript\nconst x = 1;\n```';
      const blocks = parseCodeBlocks(content);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe('typescript');
      expect(blocks[0].code).toBe('const x = 1;');
    });

    it('should parse multiple code blocks', () => {
      const content = '```js\ncode1\n```\ntext\n```python\ncode2\n```';
      const blocks = parseCodeBlocks(content);

      expect(blocks).toHaveLength(2);
    });

    it('should handle code blocks without language', () => {
      const content = '```\nplain code\n```';
      const blocks = parseCodeBlocks(content);

      expect(blocks[0].language).toBe('text');
    });
  });

  describe('extractFirstCode', () => {
    it('should return first code block', () => {
      const content = 'text\n```ts\nfirst\n```\n```ts\nsecond\n```';
      expect(extractFirstCode(content)).toBe('first');
    });

    it('should return null if no code blocks', () => {
      expect(extractFirstCode('no code here')).toBeNull();
    });
  });
});
````

---

## Configuration

```typescript
// config/app.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
}));

// config/cli.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('cli', () => ({
  geminiCommand: process.env.GEMINI_CLI || 'gemini',
  claudeCommand: process.env.CLAUDE_CLI || 'claude',
  workspaceDir: process.env.WORKSPACE_DIR || process.cwd(),
  timeout: parseInt(process.env.CLI_TIMEOUT, 10) || 60000,
}));
```

---

## Testing Guidelines

### Unit Test Example

```typescript
// generate/generate.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GenerateService } from './generate.service';
import { CliService } from '../cli/cli.service';
import { ConversationService } from '../conversation/conversation.service';

describe('GenerateService', () => {
  let service: GenerateService;
  let cliService: jest.Mocked<CliService>;

  const mockCliService = {
    execute: jest.fn(),
  };

  const mockConversationService = {
    addMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateService,
        { provide: CliService, useValue: mockCliService },
        { provide: ConversationService, useValue: mockConversationService },
      ],
    }).compile();

    service = module.get<GenerateService>(GenerateService);
    cliService = module.get(CliService);

    jest.clearAllMocks();
  });

  describe('runGemini', () => {
    it('should yield chunks from CLI', async () => {
      const chunks = [
        { source: 'gemini', content: 'Hello', timestamp: 1, type: 'text' },
        { source: 'gemini', content: ' World', timestamp: 2, type: 'text' },
      ];

      mockCliService.execute.mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      });

      const result: any[] = [];
      for await (const chunk of service.runGemini('test prompt')) {
        result.push(chunk);
      }

      expect(result).toEqual(chunks);
      expect(mockConversationService.addMessage).toHaveBeenCalled();
    });
  });
});
```

### Controller Test Example

```typescript
// generate/generate.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GenerateController } from './generate.controller';
import { GenerateService } from './generate.service';
import { Response } from 'express';

describe('GenerateController', () => {
  let controller: GenerateController;
  let generateService: jest.Mocked<GenerateService>;

  const mockResponse = {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const mockGenerateService = {
      runGemini: jest.fn(),
      runClaude: jest.fn(),
      getLastCode: jest.fn().mockReturnValue('test code'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [{ provide: GenerateService, useValue: mockGenerateService }],
    }).compile();

    controller = module.get<GenerateController>(GenerateController);
    generateService = module.get(GenerateService);
  });

  it('should set SSE headers', async () => {
    generateService.runGemini.mockImplementation(async function* () {});
    generateService.runClaude.mockImplementation(async function* () {});

    await controller.generate({ prompt: 'test' }, mockResponse);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
  });

  it('should write done event at the end', async () => {
    generateService.runGemini.mockImplementation(async function* () {});
    generateService.runClaude.mockImplementation(async function* () {});

    await controller.generate({ prompt: 'test' }, mockResponse);

    expect(mockResponse.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"done"'),
    );
    expect(mockResponse.end).toHaveBeenCalled();
  });
});
```

### E2E Test Example

```typescript
// test/generate.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Generate (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/generate (POST) should return SSE stream', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/generate')
      .send({ prompt: 'Hello' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(response.text).toContain('data:');
  });
});
```

---

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.interface.ts',
    '!**/*.entity.ts',
    '!main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@duet/shared$': '<rootDir>/../../packages/shared/src',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

---

## Commands

```bash
# Development
pnpm start:dev

# Production build
pnpm build

# Production run
pnpm start:prod

# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E tests
pnpm test:e2e

# Lint
pnpm lint
```

---

## Dependencies

```bash
# Production
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express
pnpm add @nestjs/config @nestjs/serve-static
pnpm add rxjs reflect-metadata
pnpm add class-validator class-transformer

# Development
pnpm add -D @nestjs/cli @nestjs/testing
pnpm add -D typescript @types/node @types/express
pnpm add -D jest @types/jest ts-jest
pnpm add -D supertest @types/supertest
pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

---

## ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

---

## Checklist

### Before Creating Module

- [ ] Define module boundaries
- [ ] Identify dependencies
- [ ] Plan interfaces and DTOs
- [ ] Design test cases

### Before Commit

- [ ] All tests pass (`pnpm test`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Types are correct
- [ ] DTOs have validation decorators
- [ ] Services have proper error handling
