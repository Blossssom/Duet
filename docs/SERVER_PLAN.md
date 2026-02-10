# SERVER TODO

> Step-by-step implementation plan for Duet server

---

## Phase 1: Project Setup

### Step 1.1: Initialize NestJS Project

- [x] Create NestJS project with `@nestjs/cli`
- [x] Configure `tsconfig.json` for strict mode
- [x] Add path alias for `@duet/shared`
- [x] Verify project runs with `pnpm start:dev`

```bash
# Commands
nest new . --package-manager pnpm --skip-git
```

### Step 1.2: Configure ESLint & Prettier

- [x] Install ESLint dependencies
- [x] Create `.eslintrc.js` with TypeScript rules
- [x] Create `.prettierrc`
- [x] Add `tsconfigRootDir` to parser options
- [x] Verify lint passes with `pnpm lint`

### Step 1.3: Setup Configuration Module

- [x] Install `@nestjs/config`
- [x] Create `config/app.config.ts`
- [x] Create `config/cli.config.ts`
- [x] Create `config/config.module.ts`
- [x] Add `.env` file with defaults
- [x] Import ConfigModule in AppModule

```typescript
// Expected .env
PORT=3000
WORKSPACE_DIR=./workspace
GEMINI_CLI=gemini
CLAUDE_CLI=claude
```

### Step 1.4: Setup Static File Serving

- [x] Install `@nestjs/serve-static`
- [x] Configure ServeStaticModule for client dist
- [x] Test with placeholder `index.html`

---

## Phase 2: CLI Module

### Step 2.1: Create CLI Module Structure

- [x] Create `cli/cli.module.ts`
- [x] Create `cli/cli.service.ts`
- [x] Create `cli/interfaces/cli-options.interface.ts`
- [x] Export CliModule

### Step 2.2: Implement Basic CLI Execution

- [x] Implement `execute()` method with child_process.spawn
- [x] Add command configuration from ConfigService
- [x] Handle basic stdout streaming
- [x] Test with simple command (e.g., `echo "hello"`)

```typescript
// Test case
const chunks = [];
for await (const chunk of cliService.execute("echo", "hello")) {
  chunks.push(chunk);
}
expect(chunks.length).toBeGreaterThan(0);
```

### Step 2.3: Implement Async Generator Streaming

- [x] Convert stdout to AsyncGenerator
- [x] Convert stderr to AsyncGenerator
- [x] Combine streams properly
- [x] Add proper typing with `StreamChunk`

### Step 2.4: Add Error Handling

- [x] Handle spawn errors
- [x] Handle process exit codes
- [x] Add timeout support
- [x] Log errors with NestJS Logger

### Step 2.5: Write CLI Service Tests

- [x] Test successful command execution
- [x] Test error handling
- [x] Test timeout behavior
- [x] Mock child_process for unit tests

---

## Phase 3: Generate Module

### Step 3.1: Create Generate Module Structure

- [x] Create `generate/generate.module.ts`
- [x] Create `generate/generate.controller.ts`
- [x] Create `generate/generate.service.ts`
- [x] Create `generate/dto/generate.dto.ts`
- [x] Import CliModule

### Step 3.2: Implement Generate DTO

- [x] Add `prompt` field with validation
- [x] Add optional `skipReview` field
- [x] Install class-validator, class-transformer
- [x] Enable global validation pipe in main.ts

```typescript
// generate.dto.ts
export class GenerateDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsBoolean()
  skipReview?: boolean;
}
```

### Step 3.3: Implement SSE Endpoint (Basic)

- [x] Create POST `/api/generate` endpoint
- [x] Set SSE headers (Content-Type, Cache-Control, Connection)
- [x] Return simple test stream
- [ ] Test with curl or Postman

```bash
# Test command
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

### Step 3.4: Implement Generate Service - Gemini

- [x] Implement `runGemini()` async generator
- [x] Call CliService with gemini command
- [x] Accumulate output for later use
- [x] Yield chunks to controller

### Step 3.5: Implement Code Parser Utility

- [x] Create `common/utils/code-parser.util.ts`
- [x] Implement `parseCodeBlocks()` function
- [x] Implement `extractFirstCode()` function
- [x] Write unit tests for parser

````typescript
// Test cases
parseCodeBlocks("```ts\ncode\n```"); // [{ language: 'ts', code: 'code' }]
parseCodeBlocks("no code"); // []
````

### Step 3.6: Implement Generate Service - Claude

- [x] Implement `runClaude()` async generator
- [x] Build review prompt with extracted code
- [x] Call CliService with claude command
- [x] Yield chunks to controller

### Step 3.7: Connect Controller to Service

- [x] Wire up Gemini streaming in controller
- [x] Extract code after Gemini completes
- [x] Wire up Claude streaming in controller
- [x] Send 'done' event at the end
- [x] Handle errors with 'error' event

### Step 3.8: Write Generate Service Tests

- [x] Test runGemini yields chunks
- [x] Test runClaude yields chunks
- [x] Test code extraction works
- [x] Mock CliService for unit tests

### Step 3.9: Write Generate Controller Tests

- [x] Test SSE headers are set
- [x] Test chunks are written correctly
- [x] Test done event is sent
- [x] Test error handling

---

## Phase 4: Conversation Module

### Step 4.1: Create Conversation Module Structure

- [x] Create `conversation/conversation.module.ts`
- [x] Create `conversation/conversation.service.ts`
- [x] Create `conversation/entities/message.entity.ts`
- [x] Create `conversation/entities/conversation.entity.ts`

### Step 4.2: Implement In-Memory Storage

- [x] Store messages in memory (Map or Array)
- [x] Implement `addMessage()` method
- [x] Implement `getMessages()` method
- [x] Implement `clearMessages()` method

### Step 4.3: Integrate with Generate Service

- [x] Inject ConversationService into GenerateService
- [x] Save user prompt as message
- [x] Save Gemini output as message
- [x] Save Claude output as message

### Step 4.4: Add History Endpoint (Optional)

- [x] Create GET `/api/history` endpoint
- [x] Return conversation messages
- [x] Add GET `/api/history/:id` for single conversation messages

### Step 4.5: Write Conversation Service Tests

- [x] Test addMessage
- [x] Test getMessages
- [x] Test clearMessages

---

## Phase 5: Error Handling & Polish

### Step 5.1: Global Exception Filter

- [x] Create `common/filters/http-exception.filter.ts`
- [x] Handle all exceptions uniformly
- [x] Return proper error responses
- [x] Apply globally in main.ts

### Step 5.2: Logging Interceptor

- [x] Create `common/interceptors/logging.interceptor.ts`
- [x] Log request/response times
- [x] Log errors
- [x] Apply globally

### Step 5.3: Health Check Endpoint

- [x] Create GET `/api/health` endpoint
- [x] Check CLI availability
- [x] Return status

### Step 5.4: CLI Availability Check

- [ ] Check if gemini CLI exists on startup
- [ ] Check if claude CLI exists on startup
- [ ] Log warnings if not found
- [ ] Provide helpful error messages

---

## Phase 6: E2E Testing

### Step 6.1: Setup E2E Test Environment

- [ ] Configure jest-e2e.json
- [ ] Create test utilities
- [ ] Setup test app initialization

### Step 6.2: Write E2E Tests

- [ ] Test `/api/generate` returns SSE stream
- [ ] Test `/api/health` returns status
- [ ] Test error handling
- [ ] Test with mock CLI commands

---

## Phase 7: Production Ready

### Step 7.1: Build Configuration

- [ ] Verify `pnpm build` works
- [ ] Test production build runs
- [ ] Configure proper static file path

### Step 7.2: Documentation

- [ ] Add API documentation comments
- [ ] Update README with API endpoints
- [ ] Document environment variables

---

## Verification Checklist

After each phase, verify:

- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Server starts without errors
- [ ] API endpoints respond correctly
