# PROJECT PLAN

> Root project setup, workspace configuration, and integration tasks

---

## Overview

This plan covers project-level setup that spans both client and server, including:

- pnpm workspace configuration
- Shared package setup
- Development environment (Vite proxy)
- Production build (static file serving)
- Integration and deployment

---

## Phase 1: Workspace Setup

### Step 1.1: Initialize Root Project

- [ ] Create root `package.json`
- [ ] Set `"private": true`
- [ ] Add project name `"duet"`

```json
{
  "name": "duet",
  "private": true,
  "scripts": {},
  "devDependencies": {}
}
```

### Step 1.2: Create pnpm Workspace Configuration

- [ ] Create `pnpm-workspace.yaml`
- [ ] Define workspace packages

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Step 1.3: Create Directory Structure

- [ ] Create `apps/` directory
- [ ] Create `apps/client/` directory
- [ ] Create `apps/server/` directory
- [ ] Create `packages/` directory
- [ ] Create `packages/shared/` directory
- [ ] Create `docs/` directory

```bash
mkdir -p apps/client apps/server packages/shared docs
```

### Step 1.4: Add Root Scripts

- [ ] Add `dev` script (parallel run)
- [ ] Add `build` script
- [ ] Add `lint` script
- [ ] Add `test` script
- [ ] Add `typecheck` script
- [ ] Add `start` script (production)

```json
{
  "scripts": {
    "dev": "pnpm --parallel -r run dev",
    "build": "pnpm -r run build",
    "build:client": "pnpm --filter @duet/client build",
    "build:server": "pnpm --filter @duet/server build",
    "lint": "pnpm -r run lint",
    "test": "pnpm -r run test",
    "typecheck": "pnpm -r run typecheck",
    "start": "pnpm --filter @duet/server start:prod"
  }
}
```

### Step 1.5: Add Root Development Dependencies

- [ ] Install TypeScript
- [ ] Install ESLint (optional, for root config)

```bash
pnpm add -D typescript
```

---

## Phase 2: Shared Package (@duet/shared)

### Step 2.1: Initialize Shared Package

- [ ] Create `packages/shared/package.json`
- [ ] Set package name `@duet/shared`
- [ ] Set `"private": true`
- [ ] Configure main and types entry

```json
{
  "name": "@duet/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

### Step 2.2: Setup TypeScript for Shared

- [ ] Create `packages/shared/tsconfig.json`
- [ ] Enable strict mode
- [ ] Configure for library usage

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Step 2.3: Create Type Definitions

- [ ] Create `packages/shared/src/index.ts`
- [ ] Create `packages/shared/src/types/index.ts`
- [ ] Create `packages/shared/src/types/agent.ts`
- [ ] Create `packages/shared/src/types/conversation.ts`
- [ ] Create `packages/shared/src/types/workflow.ts`

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
```

### Step 2.4: Create Constants

- [ ] Create `packages/shared/src/constants/index.ts`
- [ ] Create `packages/shared/src/constants/api.ts`

```typescript
// packages/shared/src/constants/api.ts
export const API_ENDPOINTS = {
  GENERATE: "/api/generate",
  HISTORY: "/api/history",
  HEALTH: "/api/health",
} as const;

export const SSE_EVENTS = {
  CHUNK: "chunk",
  DONE: "done",
  ERROR: "error",
} as const;
```

### Step 2.5: Export Everything

- [ ] Create barrel exports in `index.ts`
- [ ] Verify exports work

```typescript
// packages/shared/src/index.ts
export * from "./types";
export * from "./constants";
```

### Step 2.6: Install Shared Dependencies

- [ ] Add TypeScript as dev dependency

```bash
cd packages/shared
pnpm add -D typescript
```

---

## Phase 3: Development Environment

### Step 3.1: Configure Vite Proxy (Client)

- [ ] Open `apps/client/vite.config.ts`
- [ ] Add proxy configuration for `/api/*`
- [ ] Point to server port (3000)

```typescript
// apps/client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

### Step 3.2: Configure CORS (Server - Development)

- [ ] Enable CORS in NestJS for development
- [ ] Allow localhost:5173

```typescript
// apps/server/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (process.env.NODE_ENV === "development") {
    app.enableCors({
      origin: "http://localhost:5173",
    });
  }

  await app.listen(3000);
}
```

### Step 3.3: Add Workspace Dependency Links

- [ ] Add `@duet/shared` to client dependencies
- [ ] Add `@duet/shared` to server dependencies

```json
// apps/client/package.json
{
  "dependencies": {
    "@duet/shared": "workspace:*"
  }
}

// apps/server/package.json
{
  "dependencies": {
    "@duet/shared": "workspace:*"
  }
}
```

### Step 3.4: Configure TypeScript Paths

- [ ] Add path alias in client tsconfig
- [ ] Add path alias in server tsconfig

```json
// apps/client/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@duet/shared": ["../../packages/shared/src"]
    }
  }
}

// apps/server/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@duet/shared": ["../../packages/shared/src"]
    }
  }
}
```

### Step 3.5: Verify Development Setup

- [ ] Run `pnpm install` from root
- [ ] Start server: `pnpm --filter @duet/server dev`
- [ ] Start client: `pnpm --filter @duet/client dev`
- [ ] Verify client can reach server via proxy
- [ ] Verify `@duet/shared` imports work

---

## Phase 4: Production Build

### Step 4.1: Configure Client Build Output

- [ ] Verify Vite builds to `dist/` folder
- [ ] Test build with `pnpm --filter @duet/client build`

### Step 4.2: Configure Static File Serving (Server)

- [ ] Install `@nestjs/serve-static`
- [ ] Configure ServeStaticModule in AppModule
- [ ] Set correct path to client dist

```typescript
// apps/server/src/app.module.ts
import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "..", "..", "client", "dist"),
      exclude: ["/api*"],
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 4.3: Configure Production Build Order

- [ ] Build client first (generates dist/)
- [ ] Build server second
- [ ] Update root build script if needed

```json
{
  "scripts": {
    "build": "pnpm --filter @duet/client build && pnpm --filter @duet/server build"
  }
}
```

### Step 4.4: Verify Production Build

- [ ] Run `pnpm build` from root
- [ ] Start production server: `pnpm start`
- [ ] Open http://localhost:3000
- [ ] Verify client loads
- [ ] Verify API works

---

## Phase 5: Environment Configuration

### Step 5.1: Create Environment Files

- [ ] Create `apps/server/.env.example`
- [ ] Create `apps/server/.env` (gitignored)
- [ ] Document all variables

```env
# apps/server/.env.example
PORT=3000
NODE_ENV=development
WORKSPACE_DIR=./workspace
GEMINI_CLI=gemini
CLAUDE_CLI=claude
```

### Step 5.2: Add .gitignore Rules

- [ ] Create/update root `.gitignore`
- [ ] Ignore node_modules
- [ ] Ignore dist folders
- [ ] Ignore .env files (keep .example)

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
```

### Step 5.3: Create Workspace Directory

- [ ] Create `workspace/` directory for CLI working dir
- [ ] Add `.gitkeep` to track empty folder
- [ ] Add `workspace/*` to .gitignore (except .gitkeep)

---

## Phase 6: Documentation

### Step 6.1: Update README.md

- [ ] Add project description
- [ ] Add prerequisites (Node.js, pnpm, CLI tools)
- [ ] Add installation steps
- [ ] Add development commands
- [ ] Add production deployment steps

### Step 6.2: Move Plan Files

- [ ] Move `apps/server/TODO.md` to `docs/SERVER_PLAN.md`
- [ ] Move `apps/client/TODO.md` to `docs/CLIENT_PLAN.md`
- [ ] Verify CLAUDE.md references are correct

### Step 6.3: Add Architecture Documentation

- [ ] Create `docs/ARCHITECTURE.md` (optional)
- [ ] Document data flow
- [ ] Document module responsibilities

---

## Phase 7: CI/CD (Optional)

### Step 7.1: Add GitHub Actions Workflow

- [ ] Create `.github/workflows/ci.yml`
- [ ] Run lint on PR
- [ ] Run tests on PR
- [ ] Run build on PR

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

---

## Verification Checklist

After completing all phases, verify:

### Development Mode

- [ ] `pnpm install` succeeds
- [ ] `pnpm dev` starts both client and server
- [ ] Client accessible at http://localhost:5173
- [ ] Server accessible at http://localhost:3000
- [ ] API calls from client reach server via proxy
- [ ] `@duet/shared` imports work in both apps

### Production Mode

- [ ] `pnpm build` succeeds
- [ ] `pnpm start` starts production server
- [ ] http://localhost:3000 serves client app
- [ ] API endpoints work
- [ ] Static assets load correctly

### Code Quality

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes

---

## Quick Reference

### Development

```bash
# Install all dependencies
pnpm install

# Start development (both apps)
pnpm dev

# Start only client
pnpm --filter @duet/client dev

# Start only server
pnpm --filter @duet/server dev
```

### Production

```bash
# Build everything
pnpm build

# Start production server (serves client + API)
pnpm start
```

### Adding Dependencies

```bash
# Add to client
pnpm --filter @duet/client add <package>

# Add to server
pnpm --filter @duet/server add <package>

# Add to shared
pnpm --filter @duet/shared add -D <package>

# Add to root (dev tools)
pnpm add -D -w <package>
```
