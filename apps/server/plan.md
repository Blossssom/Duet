# Server Development Plan

This document outlines the next steps for developing the `apps/server` NestJS application, following the project's overall development phases and the detailed structure defined in `GEMINI.md` and `apps/server/SERVER.md`.

## Objective

To implement the core backend functionality for the Duet application, specifically focusing on integrating with Gemini and Claude CLIs for code generation and review, and streaming their output via Server-Sent Events (SSE) to the client.

## Current Phase: Phase 1 & Moving to Phase 2 (CLI Integration)

The `apps/server` project has been initialized. The next immediate steps focus on building out the core modules to support "Phase 2: CLI Integration" from the `GEMINI.md` overview.

## Next Steps: Phase 2 - CLI Integration (Server Side)

We will proceed module by module, following the structure and guidelines outlined in `SERVER.md`.

### 1. Shared Types Integration

*   **Goal**: Ensure the server can correctly use the shared types defined in `@duet/shared`.
*   **Tasks**:
    *   Verify `@duet/shared` is accessible within `apps/server`'s `tsconfig.json` (via `paths` mapping in the root `tsconfig.json` or `moduleNameMapper` in `jest.config.js`).
    *   Add imports for `StreamChunk`, `AgentType`, `GenerateRequest`, etc., where needed.

### 2. Configuration Module (`config`)

*   **Goal**: Centralize application and CLI-related configuration.
*   **Tasks**:
    *   Create `src/config/config.module.ts`.
    *   Create `src/config/app.config.ts` for general app settings (e.g., `PORT`).
    *   Create `src/config/cli.config.ts` for CLI-specific settings (e.g., `GEMINI_CLI`, `CLAUDE_CLI`, `WORKSPACE_DIR`).
    *   Integrate `ConfigModule.forRoot()` and `ConfigModule.load()` in `app.module.ts`.

### 3. CLI Module (`cli`)

*   **Goal**: Provide a service for executing external CLI commands (Gemini, Claude) and streaming their output.
*   **Tasks**:
    *   Create `src/cli/cli.module.ts`.
    *   Create `src/cli/cli.service.ts`.
    *   Implement `CliService.execute(agent: AgentType, prompt: string): AsyncGenerator<StreamChunk>` using `child_process.spawn`.
        *   Handle `stdout` and `stderr` streaming as `StreamChunk`s.
        *   Read `GEMINI_CLI`, `CLAUDE_CLI`, and `WORKSPACE_DIR` from `ConfigService`.
    *   Add `src/cli/cli.service.spec.ts` with unit tests for `execute` method, covering successful streaming and error handling.

### 4. Common Utilities (`common/utils`)

*   **Goal**: Implement the `code-parser.util.ts` for extracting code blocks from text.
*   **Tasks**:
    *   Create `src/common/utils/code-parser.util.ts` with `parseCodeBlocks` and `extractFirstCode` functions.
    *   Create `src/common/utils/code-parser.util.spec.ts` with unit tests for the parsing logic.

### 5. Conversation Module (Initial - `conversation`)

*   **Goal**: Provide a basic service to store conversation messages. Persistence will be added later.
*   **Tasks**:
    *   Create `src/conversation/conversation.module.ts`.
    *   Create `src/conversation/conversation.service.ts` with a placeholder `addMessage` method that currently just logs or stores in memory.
    *   Create `src/conversation/entities/message.entity.ts` based on shared `Message` interface if needed, or simply use `Message` from `@duet/shared`.
    *   Add `src/conversation/conversation.service.spec.ts` with basic tests.

### 6. Generate Module (`generate`)

*   **Goal**: Implement the main SSE endpoint for triggering code generation and review.
*   **Tasks**:
    *   Create `src/generate/generate.module.ts`.
    *   Create `src/generate/dto/generate.dto.ts` with `prompt` and `skipReview` properties using `class-validator` decorators.
    *   Create `src/generate/generate.service.ts`.
        *   Inject `CliService` and `ConversationService`.
        *   Implement `runGemini(prompt: string): AsyncGenerator<StreamChunk>`: calls `cliService.execute('gemini', prompt)`, accumulates output, parses code, and calls `conversationService.addMessage`.
        *   Implement `runClaude(code: string): AsyncGenerator<StreamChunk>`: builds review prompt and calls `cliService.execute('claude', reviewPrompt)`.
        *   Implement `getLastCode()` to retrieve the generated code from Gemini for Claude's review.
        *   Add `src/generate/generate.service.spec.ts` with comprehensive unit tests.
    *   Create `src/generate/generate.controller.ts`.
        *   Set up SSE headers (`Content-Type`, `Cache-Control`, `Connection`, `X-Accel-Buffering`).
        *   Implement the `@Post('generate')` endpoint to orchestrate calls to `generateService.runGemini` and `generateService.runClaude`, streaming `StreamChunk`s to the client.
        *   Handle `done` and `error` events in the SSE stream.
        *   Add `src/generate/generate.controller.spec.ts` with unit tests for SSE header setup and event streaming.
    *   Add `test/generate.e2e-spec.ts` for end-to-end testing of the `/api/generate` endpoint.

### 7. App Module (`app.module.ts`)

*   **Goal**: Integrate all new and existing modules.
*   **Tasks**:
    *   Import `ConfigModule`, `CliModule`, `ConversationModule`, and `GenerateModule` into `app.module.ts`.
    *   Remove default `AppController` and `AppService` if not needed, or adapt them for health checks.

### 8. ESLint and Prettier Configuration

*   **Goal**: Ensure code quality and consistent formatting.
*   **Tasks**:
    *   Verify `.eslintrc.js` and `.prettierrc` are present and correctly configured as per `SERVER.md`.
    *   Run `pnpm lint` and `pnpm prettier --write .` to ensure compliance.

## Checklist for this Phase

- [ ] `@duet/shared` types integrated.
- [ ] `config` module implemented and integrated.
- [ ] `cli` module (service, module, spec) implemented.
- [ ] `code-parser.util.ts` (util, spec) implemented.
- [ ] `conversation` module (initial service, module, entity/type, spec) implemented.
- [ ] `generate` module (dto, service, controller, modules, specs, e2e test) implemented.
- [ ] `app.module.ts` updated with all new modules.
- [ ] All new code adheres to ESLint and Prettier rules.
- [ ] All unit and e2e tests pass for newly implemented features.
