# CLIENT TODO

> Step-by-step implementation plan for Duet client

---

## Phase 1: Project Setup

### Step 1.1: Initialize Vite + React Project

- [ ] Create Vite project with React TypeScript template
- [ ] Verify project runs with `pnpm dev`
- [ ] Clean up default files (App.css, etc.)

```bash
# Commands
pnpm create vite . --template react-ts
```

### Step 1.2: Configure TypeScript

- [ ] Enable strict mode in `tsconfig.json`
- [ ] Add path alias `@/*` for src directory
- [ ] Add path alias `@duet/shared`
- [ ] Update `vite.config.ts` with aliases

```json
// tsconfig.json paths
{
  "paths": {
    "@/*": ["src/*"],
    "@duet/shared": ["../../packages/shared/src"]
  }
}
```

### Step 1.3: Setup TailwindCSS

- [ ] Install tailwindcss, postcss, autoprefixer
- [ ] Create `tailwind.config.js`
- [ ] Create `postcss.config.js`
- [ ] Add Tailwind directives to `index.css`
- [ ] Verify styles work

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 1.4: Configure ESLint

- [ ] Install ESLint dependencies
- [ ] Create `.eslintrc.js` with React + TypeScript rules
- [ ] Add `tsconfigRootDir` to parser options
- [ ] Add FSD import restrictions
- [ ] Verify lint passes

### Step 1.5: Setup Jest & React Testing Library

- [ ] Install Jest and testing dependencies
- [ ] Create `jest.config.js`
- [ ] Create `jest.setup.ts`
- [ ] Add test script to package.json
- [ ] Verify test runs with sample test

---

## Phase 2: FSD Structure Setup

### Step 2.1: Create FSD Directory Structure

- [ ] Create `src/app/` directory
- [ ] Create `src/pages/` directory
- [ ] Create `src/widgets/` directory
- [ ] Create `src/features/` directory
- [ ] Create `src/entities/` directory
- [ ] Create `src/shared/` directory

### Step 2.2: Setup Shared Layer

- [ ] Create `shared/ui/index.ts`
- [ ] Create `shared/lib/index.ts`
- [ ] Create `shared/lib/cn.ts` (classnames utility)
- [ ] Create `shared/config/constants.ts`
- [ ] Create `shared/api/client.ts`

```typescript
// shared/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Step 2.3: Setup App Layer

- [ ] Create `app/index.tsx` (entry point)
- [ ] Create `app/App.tsx` (root component)
- [ ] Create `app/styles/index.css`
- [ ] Create `app/providers/index.tsx`
- [ ] Update main.tsx to use app/index.tsx

---

## Phase 3: Shared UI Components

### Step 3.1: Create Button Component

- [ ] Create `shared/ui/Button/Button.tsx`
- [ ] Add variants (primary, secondary, ghost)
- [ ] Add sizes (sm, md, lg)
- [ ] Add loading state
- [ ] Create `shared/ui/Button/Button.test.tsx`
- [ ] Export from `shared/ui/index.ts`

```typescript
// Usage
<Button variant="primary" size="md" isLoading={false}>
  Generate
</Button>
```

### Step 3.2: Create Card Component

- [ ] Create `shared/ui/Card/Card.tsx`
- [ ] Add header, body, footer slots
- [ ] Style with Tailwind
- [ ] Export from `shared/ui/index.ts`

### Step 3.3: Create Input Component

- [ ] Create `shared/ui/Input/Input.tsx`
- [ ] Add textarea variant for prompts
- [ ] Add error state styling
- [ ] Create test file
- [ ] Export from `shared/ui/index.ts`

### Step 3.4: Install Markdown Dependencies

- [ ] Install react-markdown
- [ ] Install remark-gfm
- [ ] Install rehype-highlight
- [ ] Install highlight.js (for themes)

### Step 3.5: Create MarkdownRenderer Component

- [ ] Create `shared/ui/MarkdownRenderer/MarkdownRenderer.tsx`
- [ ] Configure react-markdown plugins
- [ ] Add code block styling
- [ ] Test with sample markdown

---

## Phase 4: Entity Layer

### Step 4.1: Create Message Entity Structure

- [ ] Create `entities/message/` directory
- [ ] Create `entities/message/model/types.ts`
- [ ] Create `entities/message/model/store.ts`
- [ ] Create `entities/message/index.ts`

### Step 4.2: Implement Message Store (Zustand)

- [ ] Install zustand
- [ ] Define Message interface
- [ ] Implement `addMessage` action
- [ ] Implement `appendToMessage` action
- [ ] Implement `setMessageStreaming` action
- [ ] Implement `clearMessages` action
- [ ] Add devtools middleware

```typescript
// Expected interface
interface MessageState {
  messages: Message[];
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => string;
  appendToMessage: (id: string, content: string) => void;
  setMessageStreaming: (id: string, isStreaming: boolean) => void;
  clearMessages: () => void;
}
```

### Step 4.3: Write Message Store Tests

- [ ] Test addMessage returns id
- [ ] Test appendToMessage updates content
- [ ] Test setMessageStreaming updates flag
- [ ] Test clearMessages empties array

### Step 4.4: Create Message UI Components

- [ ] Create `entities/message/ui/UserMessage.tsx`
- [ ] Create `entities/message/ui/AgentMessage.tsx`
- [ ] Create `entities/message/ui/ThinkingIndicator.tsx`
- [ ] Create `entities/message/ui/MessageBubble.tsx` (wrapper)
- [ ] Add data-testid attributes
- [ ] Export from index.ts

### Step 4.5: Write Message UI Tests

- [ ] Test UserMessage renders content
- [ ] Test AgentMessage renders with correct icon
- [ ] Test AgentMessage shows streaming indicator
- [ ] Test ThinkingIndicator animates

### Step 4.6: Create CodeBlock Entity

- [ ] Create `entities/code-block/` directory
- [ ] Create `entities/code-block/ui/CodeBlock.tsx`
- [ ] Create `entities/code-block/lib/parseCode.ts`
- [ ] Add copy button
- [ ] Add language label
- [ ] Add syntax highlighting

---

## Phase 5: Feature Layer

### Step 5.1: Create SSE Hook

- [ ] Create `shared/hooks/useSSE.ts`
- [ ] Implement fetch with ReadableStream
- [ ] Parse SSE data format
- [ ] Handle abort/cancel
- [ ] Add error handling
- [ ] Return { start, stop, isStreaming }

```typescript
// Expected usage
const { start, stop, isStreaming } = useSSE({
  onChunk: (chunk) => console.log(chunk),
  onError: (error) => console.error(error),
  onDone: () => console.log("done"),
});

await start("/api/generate", { prompt: "Hello" });
```

### Step 5.2: Write SSE Hook Tests

- [ ] Test start initiates fetch
- [ ] Test chunks are parsed correctly
- [ ] Test stop aborts request
- [ ] Test error callback is called
- [ ] Mock fetch for tests

### Step 5.3: Create Submit Prompt Feature Structure

- [ ] Create `features/submit-prompt/` directory
- [ ] Create `features/submit-prompt/ui/PromptInput.tsx`
- [ ] Create `features/submit-prompt/model/useSubmitPrompt.ts`
- [ ] Create `features/submit-prompt/api/generateApi.ts`
- [ ] Create `features/submit-prompt/index.ts`

### Step 5.4: Implement Generate API

- [ ] Create `generateApi.ts` with async generator
- [ ] Call POST /api/generate
- [ ] Yield StreamChunk objects
- [ ] Handle errors

### Step 5.5: Implement useSubmitPrompt Hook

- [ ] Use useSSE internally
- [ ] Connect to message store
- [ ] Add user message on submit
- [ ] Add agent placeholders
- [ ] Stream content to messages
- [ ] Handle loading state

### Step 5.6: Implement PromptInput Component

- [ ] Create textarea with submit button
- [ ] Handle Enter key (Shift+Enter for newline)
- [ ] Disable during loading
- [ ] Show loading state on button
- [ ] Clear input after submit

### Step 5.7: Write Submit Prompt Tests

- [ ] Test PromptInput renders
- [ ] Test submit calls hook
- [ ] Test input is cleared after submit
- [ ] Test disabled during loading

### Step 5.8: Create Copy Code Feature

- [ ] Create `features/copy-code/` directory
- [ ] Create `features/copy-code/ui/CopyButton.tsx`
- [ ] Implement clipboard copy
- [ ] Show success feedback
- [ ] Write tests

---

## Phase 6: Widget Layer

### Step 6.1: Create ChatPanel Widget

- [ ] Create `widgets/ChatPanel/` directory
- [ ] Create `widgets/ChatPanel/ui/ChatPanel.tsx`
- [ ] Display list of messages
- [ ] Auto-scroll to bottom on new message
- [ ] Handle empty state
- [ ] Export from index.ts

### Step 6.2: Write ChatPanel Tests

- [ ] Test renders messages
- [ ] Test auto-scrolls
- [ ] Test empty state

### Step 6.3: Create Header Widget (Optional)

- [ ] Create `widgets/Header/ui/Header.tsx`
- [ ] Add logo/title
- [ ] Add settings button placeholder
- [ ] Add clear chat button

---

## Phase 7: Page Layer

### Step 7.1: Create MainPage

- [ ] Create `pages/MainPage/` directory
- [ ] Create `pages/MainPage/ui/MainPage.tsx`
- [ ] Compose ChatPanel + PromptInput
- [ ] Add layout styling
- [ ] Export from index.ts

### Step 7.2: Implement Layout

- [ ] Full height layout
- [ ] ChatPanel takes remaining space
- [ ] PromptInput fixed at bottom
- [ ] Responsive padding

```tsx
// Layout structure
<div className="flex flex-col h-screen bg-gray-950">
  <Header />
  <ChatPanel className="flex-1 overflow-y-auto" />
  <PromptInput className="border-t border-gray-800" />
</div>
```

### Step 7.3: Write MainPage Tests

- [ ] Test renders ChatPanel
- [ ] Test renders PromptInput
- [ ] Test layout structure

---

## Phase 8: App Integration

### Step 8.1: Wire Up App Component

- [ ] Import MainPage in App.tsx
- [ ] Add global styles
- [ ] Configure dark theme

### Step 8.2: Add Error Boundary

- [ ] Create ErrorBoundary component
- [ ] Wrap App with ErrorBoundary
- [ ] Display friendly error message

### Step 8.3: Add Loading State

- [ ] Show loading on initial load
- [ ] Handle connection errors

---

## Phase 9: Styling & Polish

### Step 9.1: Dark Theme Colors

- [ ] Configure Tailwind theme colors
- [ ] Add agent-specific colors (gemini, claude)
- [ ] Add syntax highlighting theme

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      gemini: '#34d399', // emerald-400
      claude: '#a78bfa', // violet-400
    }
  }
}
```

### Step 9.2: Typography

- [ ] Configure font family
- [ ] Set up prose styles for markdown
- [ ] Configure code font

### Step 9.3: Animations

- [ ] Add fade-in for messages
- [ ] Add pulse for streaming indicator
- [ ] Add smooth scroll behavior

### Step 9.4: Responsive Design

- [ ] Test on mobile viewport
- [ ] Adjust padding for small screens
- [ ] Test on tablet viewport

---

## Phase 10: Testing & Quality

### Step 10.1: Component Test Coverage

- [ ] Verify all components have tests
- [ ] Run coverage report
- [ ] Achieve 70% coverage threshold

### Step 10.2: Integration Tests

- [ ] Test full submit → display flow
- [ ] Mock API responses
- [ ] Test error handling

### Step 10.3: Accessibility

- [ ] Add aria labels
- [ ] Test keyboard navigation
- [ ] Test with screen reader

---

## Phase 11: Build & Production

### Step 11.1: Build Configuration

- [ ] Verify `pnpm build` succeeds
- [ ] Check bundle size
- [ ] Test production build locally

### Step 11.2: Environment Configuration

- [ ] Add environment variables if needed
- [ ] Configure API base URL for production

---

## Verification Checklist

After each phase, verify:

- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Responsive on mobile

---

## Component Dependency Order

Build components in this order to avoid missing dependencies:

```
1. shared/lib/cn.ts
2. shared/ui/Button
3. shared/ui/Card
4. shared/ui/Input
5. shared/ui/MarkdownRenderer
6. entities/message/model/store
7. entities/message/ui/*
8. entities/code-block/*
9. shared/hooks/useSSE
10. features/submit-prompt/*
11. features/copy-code/*
12. widgets/ChatPanel
13. pages/MainPage
14. app/App
```
