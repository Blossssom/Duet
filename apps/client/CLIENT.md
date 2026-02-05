# CLIENT.md

> Frontend development guidelines for Duet client

---

## Overview

React-based chat UI for AI code generation and review workflow. Displays streaming responses from Gemini and Claude with markdown rendering.

---

## Tech Stack

| Technology            | Version | Purpose                  |
| --------------------- | ------- | ------------------------ |
| React                 | 18.x    | UI framework             |
| TypeScript            | 5.x     | Type safety              |
| Vite                  | 5.x     | Build tool               |
| TailwindCSS           | 3.x     | Styling                  |
| react-markdown        | 9.x     | Markdown rendering       |
| remark-gfm            | 4.x     | GitHub Flavored Markdown |
| rehype-highlight      | 7.x     | Code syntax highlighting |
| Zustand               | 4.x     | State management         |
| Jest                  | 29.x    | Test runner              |
| React Testing Library | 14.x    | Component testing        |

---

## Project Structure (FSD)

```
src/
├── app/                        # Layer 1: App
│   ├── providers/
│   │   └── index.tsx
│   ├── styles/
│   │   └── index.css
│   ├── App.tsx
│   └── index.tsx
│
├── pages/                      # Layer 2: Pages
│   └── MainPage/
│       ├── ui/
│       │   └── MainPage.tsx
│       ├── __tests__/
│       │   └── MainPage.test.tsx
│       └── index.ts
│
├── widgets/                    # Layer 3: Widgets
│   ├── ChatPanel/
│   │   ├── ui/
│   │   │   └── ChatPanel.tsx
│   │   ├── __tests__/
│   │   │   └── ChatPanel.test.tsx
│   │   └── index.ts
│   └── CodeViewer/
│       ├── ui/
│       │   └── CodeViewer.tsx
│       └── index.ts
│
├── features/                   # Layer 4: Features
│   ├── submit-prompt/
│   │   ├── ui/
│   │   │   └── PromptInput.tsx
│   │   ├── model/
│   │   │   └── useSubmitPrompt.ts
│   │   ├── api/
│   │   │   └── generateApi.ts
│   │   ├── __tests__/
│   │   │   ├── PromptInput.test.tsx
│   │   │   └── useSubmitPrompt.test.ts
│   │   └── index.ts
│   └── copy-code/
│       ├── ui/
│       │   └── CopyButton.tsx
│       ├── __tests__/
│       │   └── CopyButton.test.tsx
│       └── index.ts
│
├── entities/                   # Layer 5: Entities
│   ├── message/
│   │   ├── ui/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── UserMessage.tsx
│   │   │   ├── AgentMessage.tsx
│   │   │   └── ThinkingIndicator.tsx
│   │   ├── model/
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── __tests__/
│   │   │   ├── MessageBubble.test.tsx
│   │   │   └── store.test.ts
│   │   └── index.ts
│   └── code-block/
│       ├── ui/
│       │   └── CodeBlock.tsx
│       ├── lib/
│       │   └── parseCode.ts
│       ├── __tests__/
│       │   └── parseCode.test.ts
│       └── index.ts
│
└── shared/                     # Layer 6: Shared
    ├── ui/
    │   ├── Button/
    │   │   ├── Button.tsx
    │   │   ├── Button.test.tsx
    │   │   └── index.ts
    │   ├── Card/
    │   │   └── Card.tsx
    │   ├── MarkdownRenderer/
    │   │   └── MarkdownRenderer.tsx
    │   └── index.ts
    ├── lib/
    │   ├── cn.ts
    │   ├── sse.ts
    │   └── index.ts
    ├── api/
    │   └── client.ts
    ├── config/
    │   └── constants.ts
    ├── hooks/
    │   └── useSSE.ts
    └── types/
        └── index.ts
```

---

## FSD Layer Rules

### Import Hierarchy

```
app → pages → widgets → features → entities → shared
```

| Layer      | Can Import From                     | Cannot Import From            |
| ---------- | ----------------------------------- | ----------------------------- |
| `app`      | All layers                          | -                             |
| `pages`    | widgets, features, entities, shared | app                           |
| `widgets`  | features, entities, shared          | app, pages                    |
| `features` | entities, shared                    | app, pages, widgets           |
| `entities` | shared                              | app, pages, widgets, features |
| `shared`   | External packages only              | All internal layers           |

### Public API Rule

Only export through `index.ts`:

```typescript
// ✅ Correct
import { MessageBubble } from "@/entities/message";
import { useSubmitPrompt } from "@/features/submit-prompt";

// ❌ Wrong
import { MessageBubble } from "@/entities/message/ui/MessageBubble";
```

---

## Component Guidelines

### Message Bubble Component

```tsx
// entities/message/ui/AgentMessage.tsx
import { memo } from "react";
import type { AgentType } from "@duet/shared";
import { MarkdownRenderer } from "@/shared/ui";
import { cn } from "@/shared/lib";

interface AgentMessageProps {
  agent: AgentType;
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export const AgentMessage = memo<AgentMessageProps>(
  ({ agent, content, isStreaming, className }) => {
    const agentConfig = {
      gemini: { icon: "✨", label: "Gemini", color: "text-emerald-400" },
      claude: { icon: "🔍", label: "Claude", color: "text-violet-400" },
    };

    const { icon, label, color } = agentConfig[agent];

    return (
      <div
        className={cn("rounded-lg bg-gray-800 p-4", className)}
        data-testid={`message-${agent}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span>{icon}</span>
          <span className={cn("font-medium", color)}>{label}</span>
          {isStreaming && (
            <span className="text-xs text-gray-400 animate-pulse">
              streaming…
            </span>
          )}
        </div>
        <div className="prose prose-invert max-w-none">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    );
  },
);

AgentMessage.displayName = "AgentMessage";
```

### SSE Hook

```typescript
// shared/hooks/useSSE.ts
import { useState, useCallback, useRef } from "react";
import type { StreamChunk } from "@duet/shared";

interface UseSSEOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (url: string, body: unknown) => {
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
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
              if (data.type === "done") {
                options.onDone?.();
                return;
              }
              if (data.type === "error") {
                throw new Error(data.message);
              }
              options.onChunk?.(data as StreamChunk);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          options.onError?.(error);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [options],
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { start, stop, isStreaming };
}
```

### Markdown Renderer

```tsx
// shared/ui/MarkdownRenderer/MarkdownRenderer.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "@/entities/code-block";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          if (!inline && language) {
            return (
              <CodeBlock
                language={language}
                code={String(children).replace(/\n$/, "")}
              />
            );
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};
```

---

## State Management (Zustand)

### Message Store

```typescript
// entities/message/model/store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Message } from "@duet/shared";

interface MessageState {
  messages: Message[];

  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  appendToMessage: (id: string, content: string) => void;
  setMessageStreaming: (id: string, isStreaming: boolean) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>()(
  devtools(
    (set) => ({
      messages: [],

      addMessage: (message) => {
        const id = nanoid();
        set(
          (state) => ({
            messages: [
              ...state.messages,
              { ...message, id, timestamp: Date.now() },
            ],
          }),
          false,
          "message/add",
        );
        return id;
      },

      appendToMessage: (id, content) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, content: msg.content + content } : msg,
            ),
          }),
          false,
          "message/append",
        ),

      setMessageStreaming: (id, isStreaming) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, isStreaming } : msg,
            ),
          }),
          false,
          "message/setStreaming",
        ),

      clearMessages: () => set({ messages: [] }, false, "message/clear"),
    }),
    { name: "message-store" },
  ),
);
```

---

## Styling Guidelines

### Color Palette

```typescript
// shared/config/theme.ts
export const colors = {
  // Background
  bg: {
    primary: "bg-gray-950",
    secondary: "bg-gray-900",
    tertiary: "bg-gray-800",
  },
  // Text
  text: {
    primary: "text-gray-100",
    secondary: "text-gray-400",
    muted: "text-gray-500",
  },
  // Agent colors
  agent: {
    gemini: "text-emerald-400",
    claude: "text-violet-400",
    user: "text-blue-400",
  },
  // Status
  status: {
    success: "text-green-400",
    warning: "text-yellow-400",
    error: "text-red-400",
  },
};
```

### cn() Utility

```typescript
// shared/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Testing Guidelines

### Component Test Example

```tsx
// entities/message/__tests__/AgentMessage.test.tsx
import { render, screen } from "@testing-library/react";
import { AgentMessage } from "../ui/AgentMessage";

describe("AgentMessage", () => {
  it("should render gemini message", () => {
    render(<AgentMessage agent="gemini" content="Hello" />);

    expect(screen.getByTestId("message-gemini")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should show streaming indicator when streaming", () => {
    render(<AgentMessage agent="claude" content="..." isStreaming />);

    expect(screen.getByText("streaming…")).toBeInTheDocument();
  });
});
```

### Hook Test Example

```typescript
// features/submit-prompt/__tests__/useSubmitPrompt.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSubmitPrompt } from "../model/useSubmitPrompt";

// Mock fetch
global.fetch = jest.fn();

describe("useSubmitPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should set isLoading during submission", async () => {
    (fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true }),
          }),
        },
      }),
    );

    const { result } = renderHook(() => useSubmitPrompt());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.submit("test prompt");
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

### Store Test Example

```typescript
// entities/message/__tests__/store.test.ts
import { useMessageStore } from "../model/store";

describe("messageStore", () => {
  beforeEach(() => {
    useMessageStore.getState().clearMessages();
  });

  it("should add message and return id", () => {
    const { addMessage } = useMessageStore.getState();

    const id = addMessage({ role: "user", content: "Hello" });

    expect(id).toBeDefined();
    expect(useMessageStore.getState().messages).toHaveLength(1);
    expect(useMessageStore.getState().messages[0].content).toBe("Hello");
  });

  it("should append content to message", () => {
    const { addMessage, appendToMessage } = useMessageStore.getState();

    const id = addMessage({ role: "gemini", content: "Hello" });
    appendToMessage(id, " World");

    expect(useMessageStore.getState().messages[0].content).toBe("Hello World");
  });
});
```

---

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@duet/shared$": "<rootDir>/../../packages/shared/src",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/app/index.tsx",
  ],
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

```typescript
// jest.setup.ts
import "@testing-library/jest-dom";

// Mock fetch
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

---

## ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          "@/entities/*/*",
          "@/features/*/*",
          "@/widgets/*/*",
          "@/pages/*/*",
        ],
      },
    ],
  },
};
```

---

## Dependencies

```bash
# Production
pnpm add react react-dom
pnpm add react-markdown remark-gfm rehype-highlight
pnpm add zustand nanoid
pnpm add clsx tailwind-merge

# Development
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D vite @vitejs/plugin-react
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D jest @types/jest ts-jest jest-environment-jsdom
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D identity-obj-proxy
pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
```

---

## Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test
pnpm test:watch
pnpm test:coverage

# Lint
pnpm lint

# Type check
pnpm typecheck
```

---

## Checklist

### Before Creating Component

- [ ] Identify correct FSD layer
- [ ] Check if similar component exists in shared
- [ ] Define props interface
- [ ] Plan test cases

### Before Commit

- [ ] All tests pass (`pnpm test`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Types are correct (`pnpm typecheck`)
- [ ] Component has data-testid
- [ ] index.ts exports are updated
