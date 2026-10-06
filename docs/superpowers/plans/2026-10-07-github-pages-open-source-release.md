# GitHub Pages & Open Source Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AI Chess Arena into a fully static, client-side open-source application deployed to GitHub Pages with runtime-configurable AI endpoints, zero hardcoded secrets/env files, robust security, and full open-source documentation.

**Architecture:** Migrate from Next.js server-dependent architecture to a pure client-side Vite + React SPA. The browser connects directly to user-supplied OpenAI-compatible endpoints with SSE streaming and CORS error diagnostics. All secrets and env variables are permanently purged, keys are managed exclusively in browser memory/sessionStorage (or optional opt-in localStorage), and Stockfish single-threaded WASM runs in a Web Worker respecting GitHub Pages subpaths.

**Tech Stack:** Vite 6, React 19, TypeScript 5, chess.js, react-chessboard, stockfish.js (WASM Web Worker), GitHub Actions (`actions/deploy-pages`).

**Spec:** `/docs/prd.md` and `/docs/design.md`

## Global Constraints
- Zero environment variables for secrets: no `.env*`, no `process.env`, no `dotenv`.
- Browser-only key handling: keys never leave the browser, stored in `sessionStorage` by default (optional `localStorage` with explicit warning), never logged, masked in UI.
- Fully static output: builds into `dist/`, runnable via `vite preview --base /<repo>/`.
- Subpath asset routing: all assets (pieces, Stockfish WASM, Web Worker) respect configurable base path.
- Security hardening: strict Content-Security-Policy meta tag, plain-text model output rendering (no `dangerouslySetInnerHTML`), no third-party trackers or external web fonts.
- Honest first-run experience: first visit requires endpoint configuration or explicit Mock mode toggle; no fake or silent demo moves.

---

### Task 1: Secret Audit and Removal
**Files:**
- Delete: `.env`, `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Inspect and document all discovered secrets and private endpoints**
- [ ] **Step 2: Delete `.env` and `.env.example`**
- [ ] **Step 3: Update `.gitignore` with `.env*`, `*.pem`, `*.key`, `node_modules`, `dist`, `.DS_Store`**
- [ ] **Step 4: Audit git log and prepare manual rotation / clean history instructions**

---

### Task 2: Migrate Build Tooling to Vite
**Files:**
- Create: `vite.config.ts`, `index.html`, `404.html`
- Modify: `package.json`, `tsconfig.json`
- Delete: `next.config.ts`, `next-env.d.ts`, `src/app/api`

- [ ] **Step 1: Update `package.json` with Vite dependencies and scripts, removing Next.js**
- [ ] **Step 2: Install dependencies with `npm install`**
- [ ] **Step 3: Create `vite.config.ts` configured with base path support and React plugin**
- [ ] **Step 4: Create `index.html` with CSP headers and `404.html`**
- [ ] **Step 5: Update `tsconfig.json` for Vite bundler setup**
- [ ] **Step 6: Remove Next.js configuration files and server API directory**

---

### Task 3: Asset Path Management for Subpath Deployment
**Files:**
- Create: `src/lib/assets.ts`
- Modify: `src/lib/piece-renderer.tsx`
- Modify: `src/hooks/useStockfish.ts`

- [ ] **Step 1: Create `src/lib/assets.ts` providing `getAssetUrl` with base path awareness**
- [ ] **Step 2: Update `piece-renderer.tsx` to load piece images using `getAssetUrl`**
- [ ] **Step 3: Update `useStockfish.ts` to instantiate Web Worker using `getAssetUrl`**

---

### Task 4: Client-Side Direct LLM Streaming & Diagnostics
**Files:**
- Create: `src/lib/llm-client.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/hooks/useChessGame.ts`

- [ ] **Step 1: Implement direct browser fetch with ReadableStream SSE parser in `src/lib/llm-client.ts`**
- [ ] **Step 2: Implement "Test connection" with latency check and detailed CORS diagnostic hints**
- [ ] **Step 3: Integrate client-side LLM direct fetch into `useChessGame.ts` replacing `/api/move`**
- [ ] **Step 4: Implement honest error pause with Retry on provider failure without fallback fakes**

---

### Task 5: Custom Endpoint Settings Screen & Secure Storage
**Files:**
- Create: `src/lib/settings.ts`
- Create: `src/components/Settings/SettingsModal.tsx`
- Modify: `src/components/Control/MatchControl.tsx`
- Modify: `src/components/Header/Header.tsx`
- Modify: `src/app/page.tsx` (or `src/App.tsx`)

- [ ] **Step 1: Create `src/lib/settings.ts` managing `sessionStorage` / `localStorage` with masking and zero logging**
- [ ] **Step 2: Build comprehensive `SettingsModal.tsx` with presets, independent configs, sync toggle, test connection, and clear all**
- [ ] **Step 3: Add Settings trigger to Header and MatchControl**
- [ ] **Step 4: Add privacy notice and storage warning to settings UI**

---

### Task 6: Honest First-Run Experience & Mock Provider Control
**Files:**
- Create: `src/components/Welcome/WelcomeModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useChessGame.ts`

- [ ] **Step 1: Build `WelcomeModal.tsx` shown on first load when no endpoint is configured**
- [ ] **Step 2: Require endpoint configuration or explicit Mock mode before match can start**
- [ ] **Step 3: Ensure moves and cards display prominent LIVE or MOCK provenance badges**

---

### Task 7: Offline Storage & Scoreboard Export/Import
**Files:**
- Modify: `src/lib/storage.ts`
- Modify: `src/components/Scoreboard/ScoreboardModal.tsx`
- Modify: `src/components/Replay/ReplayModal.tsx`

- [ ] **Step 1: Add sanitized JSON export & import functions in `src/lib/storage.ts` ensuring zero credential leakage**
- [ ] **Step 2: Add Export JSON and Import JSON controls to `ScoreboardModal.tsx` and `ReplayModal.tsx`**
- [ ] **Step 3: Verify PGN download never contains API keys or provider secrets**

---

### Task 8: Security Hardening & Layout Migration
**Files:**
- Create: `src/main.tsx`, `src/App.tsx`
- Modify: `index.html`
- Modify: `src/app/globals.css`
- Modify: `src/components/Commentary/MoveCommentary.tsx`

- [ ] **Step 1: Set up `src/main.tsx` and `src/App.tsx` replacing Next.js App Router**
- [ ] **Step 2: Update CSS to use system font stack, removing Google Fonts `@import`**
- [ ] **Step 3: Verify all model reasoning output renders as plain text without innerHTML**
- [ ] **Step 4: Validate strict CSP meta tag in `index.html`**

---

### Task 9: GitHub Actions Workflow & Open Source Documentation
**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Modify: `README.md`

- [ ] **Step 1: Create `.github/workflows/deploy.yml` with official Pages actions**
- [ ] **Step 2: Add MIT `LICENSE` with author copyright placeholder**
- [ ] **Step 3: Create `SECURITY.md`, `CONTRIBUTING.md`, and `.github/ISSUE_TEMPLATE/bug_report.md`**
- [ ] **Step 4: Write comprehensive `README.md` with features, setup, Pages deploy, CORS guidance, and credits**

---

### Task 10: Verification & Final Report
**Files:**
- All repository files

- [ ] **Step 1: Run repo-wide search confirming zero instances of `sk-`, `process.env`, `dotenv`**
- [ ] **Step 2: Run `npm run build` and test `vite preview --base /ai-chess-arena/`**
- [ ] **Step 3: Verify type checking (`tsc --noEmit`) and ESLint with zero errors**
- [ ] **Step 4: Compile findings and generate comprehensive final report with manual checklist**
