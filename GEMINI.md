# CLAUDE.md

> Development guidelines for Duet project with Claude Code

---

## Project Overview

**Duet** is a local web service that enables AI-powered code generation and review workflow. Gemini generates code, Claude reviews it, and you can watch their thinking process in real-time.

### Core Goals

1. Input a prompt → Gemini generates code → Claude reviews
2. View both AI's thinking process in real-time (streaming)
3. Automated code generation → review cycle

### Constraints

- No API keys (subscription-based CLI only)
- Local server required (browser cannot execute CLI directly)
- ComfyUI-style single server (static files + SSE)

---

## Architecture

```
Browser (React Chat UI)
         │
         │ HTTP POST (prompt)
         │ SSE (streaming response)
         ▼
NestJS Server (localhost:3000)
├── Static File Server (React build)
├── Generate Controller (SSE endpoint)
├── CLI Service (child_process.spawn)
├── Conversation Service (chat history)
└── Workflow Service (Gemini → Claude pipeline)
         │
         │ spawn + stdout streaming
         ▼
Local CLI (gemini, claude)
```

### Data Flow

```
┌─────────┐     POST /generate      ┌─────────────────────────────┐
│ Browser │ ───────────────────────►│ Server                      │
│         │   { prompt: "..." }     │                             │
│         │                         │  1. spawn('gemini', prompt) │
│         │     SSE Stream          │  2. capture stdout          │
│         │◄─────────────────────── │  3. parse code from output  │
│         │  { source: "gemini",    │  4. spawn('claude', code)   │
│         │    chunk: "..." }       │  5. capture stdout          │
│         │                         │                             │
│         │◄─────────────────────── │                             │
│         │  { source: "claude",    │                             │
│         │    chunk: "..." }       │                             │
└─────────┘                         └─────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology     | Version | Purpose            |
| -------------- | ------- | ------------------ |
| React          | 18.x    | UI framework       |
| TypeScript     | 5.x     | Type safety        |
| Vite           | 5.x     | Build tool         |
| TailwindCSS    | 3.x     | Styling            |
| react-markdown | 9.x     | Markdown rendering |
| Zustand        | 4.x     | State management   |

### Backend

| Technology           | Version | Purpose                          |
| -------------------- | ------- | -------------------------------- |
| NestJS               | 10.x    | Framework                        |
| TypeScript           | 5.x     | Type safety                      |
| child_process        | -       | CLI execution (Node.js built-in) |
| @nestjs/serve-static | -       | Static file serving              |

### Removed (No longer needed)

| Technology    | Reason                               |
| ------------- | ------------------------------------ |
| ~~xterm.js~~  | No terminal UI needed                |
| ~~node-pty~~  | child_process.spawn is sufficient    |
| ~~Socket.io~~ | SSE is simpler for one-way streaming |

### Package Manager

- **pnpm** (with workspaces)

---

## Project Structure

### Overview

```
duet/
├── apps/
│   ├── client/             # React Frontend (FSD Architecture)
│   └── server/             # NestJS Backend
├── packages/
│   └── shared/             # Shared types (@duet/shared)
├── package.json            # Root workspace
├── pnpm-workspace.yaml
├── CLAUDE.md               # This file
└── README.md
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// Root package.json
{
  "name": "duet",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

### Shared Package (@duet/shared)

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── agent.ts
│   │   ├── conversation.ts
│   │   ├── workflow.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── api.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```json
// packages/shared/package.json
{
  "name": "@duet/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Importing Shared Types

```typescript
// ❌ Before - relative path hell
import type { AgentType } from "../../../../../shared";

// ✅ After - clean package import
import type { AgentType, StreamChunk } from "@duet/shared";
```

### Frontend (Feature-Sliced Design)

```
apps/client/
├── src/
│   ├── app/                    # App Layer
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.tsx
│   │   └── index.tsx
│   │
│   ├── pages/                  # Pages Layer
│   │   └── MainPage/
│   │       ├── ui/
│   │       │   └── MainPage.tsx
│   │       └── index.ts
│   │
│   ├── widgets/                # Widgets Layer
│   │   ├── ChatPanel/
│   │   │   ├── ui/
│   │   │   │   └── ChatPanel.tsx
│   │   │   └── index.ts
│   │   └── CodeViewer/
│   │       ├── ui/
│   │       │   └── CodeViewer.tsx
│   │       └── index.ts
│   │
│   ├── features/               # Features Layer
│   │   ├── submit-prompt/
│   │   │   ├── ui/
│   │   │   │   └── PromptInput.tsx
│   │   │   ├── model/
│   │   │   │   └── useSubmitPrompt.ts
│   │   │   ├── api/
│   │   │   │   └── generateApi.ts
│   │   │   └── index.ts
│   │   └── copy-code/
│   │       ├── ui/
│   │       │   └── CopyButton.tsx
│   │       └── index.ts
│   │
│   ├── entities/               # Entities Layer
│   │   ├── message/
│   │   │   ├── ui/
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   └── ThinkingIndicator.tsx
│   │   │   ├── model/
│   │   │   │   ├── store.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   └── code-block/
│   │       ├── ui/
│   │       │   └── CodeBlock.tsx
│   │       ├── lib/
│   │       │   └── parseCode.ts
│   │       └── index.ts
│   │
│   └── shared/                 # Shared Layer (FSD internal)
│       ├── ui/
│       │   ├── Button.tsx
│       │   ├── Card.tsx
│       │   ├── MarkdownRenderer.tsx
│       │   └── index.ts
│       ├── lib/
│       │   ├── cn.ts
│       │   └── sse.ts
│       ├── api/
│       │   └── client.ts
│       ├── config/
│       │   └── constants.ts
│       └── types/
│           └── index.ts
│
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Backend (NestJS)

```
apps/server/
├── src/
│   ├── generate/
│   │   ├── generate.controller.ts   # SSE endpoint
│   │   ├── generate.service.ts      # Orchestration
│   │   ├── generate.module.ts
│   │   └── dto/
│   │       └── generate.dto.ts
│   ├── cli/
│   │   ├── cli.service.ts           # CLI execution
│   │   ├── cli.module.ts
│   │   └── interfaces/
│   │       └── cli-result.interface.ts
│   ├── conversation/
│   │   ├── conversation.service.ts
│   │   ├── conversation.module.ts
│   │   └── entities/
│   │       └── message.entity.ts
│   ├── common/
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   └── utils/
│   │       └── code-parser.util.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   └── generate.e2e-spec.ts
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Shared Package Types

```typescript
// packages/shared/src/types/agent.ts
export type AgentType = "gemini" | "claude";

export interface StreamChunk {
  source: AgentType;
  content: string;
  timestamp: number;
  type: "thinking" | "code" | "text" | "error";
}

export interface GenerateRequest {
  prompt: string;
  options?: {
    skipReview?: boolean;
  };
}

export interface GenerateResult {
  id: string;
  prompt: string;
  geminiOutput: string;
  claudeReview: string;
  finalCode: string;
  timestamp: number;
}

// packages/shared/src/types/conversation.ts
import type { AgentType } from "./agent";

export interface Message {
  id: string;
  role: "user" | AgentType;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  codeBlocks?: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

// packages/shared/src/constants/api.ts
export const API_ENDPOINTS = {
  GENERATE: "/api/generate",
  HISTORY: "/api/history",
} as const;

export const SSE_EVENTS = {
  CHUNK: "chunk",
  DONE: "done",
  ERROR: "error",
} as const;

// packages/shared/src/index.ts
export * from "./types";
export * from "./constants";
```

---

## SSE Implementation

### Server (NestJS Controller)

```typescript
// apps/server/src/generate/generate.controller.ts
import { Controller, Post, Body, Res } from "@nestjs/common";
import { Response } from "express";
import { GenerateService } from "./generate.service";
import { GenerateDto } from "./dto/generate.dto";

@Controller("api")
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post("generate")
  async generate(@Body() dto: GenerateDto, @Res() res: Response) {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      // Stream Gemini output
      for await (const chunk of this.generateService.runGemini(dto.prompt)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      // Stream Claude review
      for await (const chunk of this.generateService.runClaude()) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
```

### Server (CLI Service)

```typescript
// apps/server/src/cli/cli.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "child_process";
import { ConfigService } from "@nestjs/config";
import type { StreamChunk, AgentType } from "@duet/shared";

@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(private readonly configService: ConfigService) {}

  async *execute(
    agent: AgentType,
    prompt: string,
  ): AsyncGenerator<StreamChunk> {
    const command = this.getCommand(agent);
    const child = spawn(command, [prompt], {
      cwd: this.configService.get("WORKSPACE_DIR"),
      shell: true,
    });

    for await (const data of child.stdout) {
      yield {
        source: agent,
        content: data.toString(),
        timestamp: Date.now(),
        type: "text",
      };
    }

    // Handle stderr
    for await (const data of child.stderr) {
      yield {
        source: agent,
        content: data.toString(),
        timestamp: Date.now(),
        type: "error",
      };
    }
  }

  private getCommand(agent: AgentType): string {
    return agent === "gemini"
      ? this.configService.get("GEMINI_CLI", "gemini")
      : this.configService.get("CLAUDE_CLI", "claude");
  }
}
```

### Client (SSE Hook)

```typescript
// apps/client/src/features/submit-prompt/api/generateApi.ts
import type { StreamChunk } from "@duet/shared";

export async function* streamGenerate(
  prompt: string,
): AsyncGenerator<StreamChunk> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (data.type === "done") return;
        yield data as StreamChunk;
      }
    }
  }
}
```

### Client (React Hook)

```typescript
// apps/client/src/features/submit-prompt/model/useSubmitPrompt.ts
import { useState, useCallback } from "react";
import { useMessageStore } from "@/entities/message";
import { streamGenerate } from "../api/generateApi";

export function useSubmitPrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const { addMessage, appendToMessage } = useMessageStore();

  const submit = useCallback(
    async (prompt: string) => {
      setIsLoading(true);

      // Add user message
      addMessage({ role: "user", content: prompt });

      // Add placeholder messages for agents
      const geminiId = addMessage({
        role: "gemini",
        content: "",
        isStreaming: true,
      });
      const claudeId = addMessage({
        role: "claude",
        content: "",
        isStreaming: true,
      });

      try {
        for await (const chunk of streamGenerate(prompt)) {
          const messageId = chunk.source === "gemini" ? geminiId : claudeId;
          appendToMessage(messageId, chunk.content);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, appendToMessage],
  );

  return { submit, isLoading };
}
```

---

## UI Components

### Chat Layout

````
┌─────────────────────────────────────────────────────────────┐
│  Duet - AI Code Collaboration                    [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 👤 You                                                 │ │
│  │ 로그인 API를 만들어줘                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✨ Gemini                                   streaming… │ │
│  │ ─────────────────────────────────────────────────────  │ │
│  │ 💭 로그인 API를 만들기 위해 다음을 고려합니다...        │ │
│  │                                                        │ │
│  │ ```typescript                                          │ │
│  │ export async function login(                           │ │
│  │   email: string,                                       │ │
│  │   password: string                                     │ │
│  │ ): Promise<AuthResult> {                               │ │
│  │   ...                                                  │ │
│  │ }                                                      │ │
│  │ ```                                           [Copy]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🔍 Claude                                   streaming… │ │
│  │ ─────────────────────────────────────────────────────  │ │
│  │ 💭 코드를 검토하겠습니다...                             │ │
│  │                                                        │ │
│  │ ## 검토 결과                                           │ │
│  │                                                        │ │
│  │ ### ✅ 잘된 점                                         │ │
│  │ - 타입 정의가 명확함                                   │ │
│  │                                                        │ │
│  │ ### ⚠️ 개선 필요                                       │ │
│  │ - SQL 인젝션 방어 필요                                 │ │
│  │                                                        │ │
│  │ ```typescript                                          │ │
│  │ // 수정된 코드                                         │ │
│  │ ...                                                    │ │
│  │ ```                                           [Copy]   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐ [Generate]    │
│  │ 프롬프트 입력...                          │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
````

---

## FSD Layer Rules

| Layer      | Can Import From                     | Purpose                       |
| ---------- | ----------------------------------- | ----------------------------- |
| `app`      | All layers                          | App initialization, providers |
| `pages`    | widgets, features, entities, shared | Full pages                    |
| `widgets`  | features, entities, shared          | Composite UI blocks           |
| `features` | entities, shared                    | User interactions             |
| `entities` | shared                              | Business entities             |
| `shared`   | Nothing (external only)             | Reusable code                 |

### Public API Rule

Only export through `index.ts`:

```typescript
// ✅ Good
import { MessageBubble } from "@/entities/message";
import type { AgentType } from "@duet/shared";

// ❌ Bad
import { MessageBubble } from "@/entities/message/ui/MessageBubble";
```

---

## Detailed Rules

- **Client**: See `./apps/client/CLAUDE.md`
- **Server**: See `./apps/server/CLAUDE.md`

---

## Coding Conventions

### General

- **Language**: TypeScript (strict mode)
- **Indentation**: 2 spaces
- **Quotes**: Single quote (`'`)
- **Semicolons**: Required
- **Trailing comma**: ES5 (`es5`)
- **Max line length**: 100 characters

### Naming

| Target            | Convention          | Example              |
| ----------------- | ------------------- | -------------------- |
| File (component)  | PascalCase          | `MessageBubble.tsx`  |
| File (util/hook)  | camelCase           | `useSubmitPrompt.ts` |
| Component         | PascalCase          | `ChatPanel`          |
| Function/Variable | camelCase           | `handleSubmit`       |
| Constant          | UPPER_SNAKE         | `API_ENDPOINTS`      |
| Type/Interface    | PascalCase          | `StreamChunk`        |
| NestJS Service    | PascalCase + Suffix | `CliService`         |

---

## Development Phases

### Phase 1: Infrastructure ⬅️ Current

- [ ] Setup pnpm workspace with apps/ and packages/
- [ ] Create @duet/shared package with types
- [ ] Initialize NestJS project (apps/server)
- [ ] Initialize React + Vite with FSD structure (apps/client)
- [ ] Implement SSE endpoint
- [ ] Basic chat UI with markdown rendering

### Phase 2: CLI Integration

- [ ] Implement CLI service with child_process
- [ ] Stream Gemini output
- [ ] Parse code blocks from output
- [ ] Stream Claude review

### Phase 3: Polish

- [ ] Code syntax highlighting
- [ ] Copy code button
- [ ] Error handling & retry
- [ ] Loading states & animations

### Phase 4: Advanced Features

- [ ] Conversation history (save/load)
- [ ] Multiple conversation tabs
- [ ] Custom prompts for review
- [ ] Theme customization

---

## Commands

```bash
# Install dependencies
pnpm install

# Development mode (client + server)
pnpm dev

# Build all
pnpm build

# Production
pnpm start

# Lint all
pnpm lint

# Type check all
pnpm typecheck

# Test all
pnpm test

# Run specific app
pnpm --filter @duet/client dev
pnpm --filter @duet/server dev
```

---

## Environment Variables

```env
# apps/server/.env
PORT=3000
WORKSPACE_DIR=./workspace
GEMINI_CLI=gemini
CLAUDE_CLI=claude
```

---

## Dependencies Installation

### Root

```bash
pnpm init
```

### Shared Package

```bash
cd packages/shared
pnpm init
pnpm add -D typescript
```

### Client

```bash
cd apps/client
pnpm create vite . --template react-ts
pnpm add @duet/shared
pnpm add react-markdown remark-gfm rehype-highlight zustand
pnpm add -D tailwindcss postcss autoprefixer @types/node
```

### Server

```bash
cd apps/server
pnpm add @duet/shared
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config @nestjs/serve-static rxjs reflect-metadata
pnpm add -D @nestjs/cli typescript @types/node
```

---

## Important Notes

### SSE vs WebSocket

- **SSE chosen** because input is one-time (prompt), output is streaming
- WebSocket would be overkill for this use case
- SSE is simpler to implement and debug

### child_process vs node-pty

- **child_process.spawn** is sufficient for capturing stdout
- node-pty is only needed for full terminal emulation (interactive input)
- spawn is simpler and has no native dependencies

### Streaming Implementation

- Server uses async generators for clean streaming code
- Client uses fetch + ReadableStream for SSE consumption
- Each chunk is a JSON object with source, content, timestamp

---

## References

- [Feature-Sliced Design](https://feature-sliced.design/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [NestJS SSE](https://docs.nestjs.com/techniques/server-sent-events)
- [MDN Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [react-markdown](https://github.com/remarkjs/react-markdown)

---

## Usage with Claude Code

Reference this file when requesting tasks:

```bash
# Example
claude "Start Phase 1. Setup pnpm workspace following CLAUDE.md"
```

## Usage with Gemini CLI

Reference this file when requesting tasks:

```bash
# Example
gemini "Start Phase 1. Setup pnpm workspace following CLAUDE.md"
```
