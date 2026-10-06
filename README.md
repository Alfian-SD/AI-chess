# AI Chess Arena ("Let them play.")

> **"Dua pemain, satu pertandingan. Kamu yang atur."**  
> An interactive spectator arena where two AI models play full chess matches against each other and viewers watch their live, unadulterated step-by-step reasoning.

---

## Features

- **Real-Time Reasoning Stream**: Stream the active model's raw internal chess thinking token by token via Server-Sent Events (SSE). No canned or fabricated commentary.
- **Classic Piece Set**: Custom crisp piece set loaded from `/public/pieces/` with fallback to text glyphs on image failure.
- **Robust Move Validation & Retry**: Moves are parsed for `MOVE: <san>` and validated against `chess.js` legal moves. Invalid moves are retried up to 3 times with feedback and highlighted in red; after 3 failures, an automatic random legal move is played and tagged `FORFEIT MOVE`.
- **Live Stockfish Evaluation (WASM)**: Centipawn eval bar alongside the board, with move quality classifications (Best, Good, Inaccuracy, Mistake, Blunder) in history.
- **Interactive Move History**: Click any past ply to view the historical board position and reasoning without breaking the live match.
- **Saved Games & Replay**: Save matches locally, replay past games with a timeline slider, export as JSON or PGN with reasoning embedded as comments.
- **Scoreboard**: Track Win/Loss/Draw statistics, average latency, and illegal-move rates across model pairings.
- **Strict Dark Theme & Tokens**: High-contrast, muted olive palette matching design specifications.
- **Localization (i18n)**: Indonesian (default) and English with instant toggle.
- **Responsive Design**: Two-column layout for desktop (1280px), single column under 900px, tight responsive layout for mobile (390px).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
- **Styling**: Vanilla CSS with design token variables (`globals.css`)
- **Chess Engine**: `chess.js` (validation, legal moves, PGN generation) + `react-chessboard`
- **Evaluation Engine**: Stockfish (WASM Web Worker)
- **Streaming**: Server-Sent Events (SSE) via Next.js Route Handlers (`/api/move`)

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18 (Node 20+ recommended)
- npm >= 9

### 2. Installation
```bash
git clone <repo-url>
cd chess
npm install --ignore-scripts
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your API keys:
```env
# Default OpenAI API Key (Kept server-side only)
OPENAI_API_KEY=sk-...

# Optional: Custom OpenAI-compatible Base URL (defaults to https://api.openai.com/v1)
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Default Model Name
OPENAI_MODEL=gpt-4o-mini
```

> **Note:** If no API key is provided, the arena automatically supports **Mock Mode** ("Mock Grandmaster" and "Mock Tactician") out-of-the-box for offline testing and demonstration.

### 4. Running Locally
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

Or build and run the production server:
```bash
npm run build
npm run start
```

---

## How to Add an OpenAI-Compatible Provider

AI Chess Arena supports any OpenAI-compatible completions API (OpenAI, OpenRouter, Groq, DeepSeek, Ollama, vLLM, LocalAI).

### Option A: Via `.env` (Global Default)
Set the Base URL and API Key in `.env`:
```env
# Example: OpenRouter
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-...
OPENAI_MODEL=deepseek/deepseek-r1

# Example: Groq
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=gsk_...
OPENAI_MODEL=llama-3.3-70b-versatile

# Example: Local Ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:7b
```

### Option B: In the Web UI (Per Player)
1. On the **MATCH CONTROL** card, click the player pairings row (`GPT-4o VS Claude 3.5 Sonnet`).
2. Select one of the presets (GPT-4o, Claude 3.5 Sonnet, DeepSeek R1, Groq Llama 3.3, Mock GM) or enter:
   - **Display Name**: Label shown on cards
   - **Model Identifier**: e.g., `gpt-4o`, `deepseek/deepseek-r1`, `llama-3.3-70b-versatile`
   - **Base URL**: e.g., `https://openrouter.ai/api/v1`
   - **API Key**: Optional per-model key override (saved in session)
3. Click **Simpan / Save**.

---

## How to Swap Piece Images

All 12 chess piece images are stored in `/public/pieces/` using standard codes:
- **White pieces**: `wK.png`, `wQ.png`, `wR.png`, `wB.png`, `wN.png`, `wP.png`
- **Black pieces**: `bK.png`, `bQ.png`, `bR.png`, `bB.png`, `bN.png`, `bP.png`

To swap with your own custom set:
1. Prepare 12 square PNG images (512x512 transparent background recommended).
2. Name each file matching `{color}{piece}.png` where `color` is `w` or `b` and `piece` is `K`, `Q`, `R`, `B`, `N`, or `P`.
3. Overwrite the files in `public/pieces/`.
4. Refresh the app. The preloader will automatically load the new images. If any image fails to load, the app gracefully falls back to Unicode text glyphs (`♔`, `♚`, etc.) with a console warning.

---

## Project Structure

```
├── public/
│   ├── pieces/              # 12 piece PNG images (wK, wQ, wR, wB, wN, wP, bK, bQ, bR, bB, bN, bP)
│   └── stockfish/           # Stockfish WASM and Web Worker binary files
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── move/route.ts# Server-side provider client, prompt builder & SSE stream
│   │   ├── globals.css      # Design tokens, dark theme, motion rules, scrollbars
│   │   ├── layout.tsx       # Root layout, metadata & LanguageProvider
│   │   └── page.tsx         # Main Arena two-column spectator interface
│   ├── components/
│   │   ├── Board/
│   │   │   ├── ChessBoard.tsx   # react-chessboard wrapper with custom piece images
│   │   │   ├── BoardActions.tsx # Putar papan, Salin FEN, Unduh PGN
│   │   │   └── EvalBar.tsx      # Stockfish centipawn evaluation split bar
│   │   ├── Commentary/
│   │   │   └── MoveCommentary.tsx # Live streaming thinking, attempts & latency
│   │   ├── Control/
│   │   │   ├── MatchControl.tsx       # Start/pause/step, delays, limits, status badge
│   │   │   └── ModelSelectorModal.tsx # Model configure modal & presets
│   │   ├── Header/
│   │   │   └── Header.tsx       # Brand header, language toggle, modal buttons
│   │   ├── History/
│   │   │   └── MoveHistory.tsx  # Move table, eval chips, click-to-jump preview
│   │   ├── Mascot/
│   │   │   └── Mascot.tsx       # Fixed decorative blue robot mascot
│   │   ├── Player/
│   │   │   └── PlayerCard.tsx   # Avatar, name, captured pieces & state badge
│   │   ├── Replay/
│   │   │   └── ReplayModal.tsx  # Saved games list, timeline slider, JSON/PGN export
│   │   └── Scoreboard/
│   │       └── ScoreboardModal.tsx # Model pairings stats (W/L/D, latency, illegal rate)
│   ├── hooks/
│   │   ├── useChessGame.ts  # Central match state coordinator & game loop
│   │   └── useStockfish.ts  # Stockfish WASM Web Worker hook
│   ├── i18n/
│   │   ├── translations.ts   # Indonesian (default) & English dictionaries
│   │   └── LanguageContext.tsx # Context provider and translation hook
│   └── lib/
│       ├── chess-engine.ts  # Chess rules, move validator, forfeit random, PGN export
│       ├── piece-renderer.tsx# Custom pieces mapper, preloading, glyph fallbacks
│       ├── storage.ts       # LocalStorage manager for saved games & scoreboard stats
│       └── types.ts         # TypeScript data contracts (Match, MoveRecord, etc.)
├── .env.example
├── design.md
├── prd.md
└── package.json
```

---

## Verification & Testing

- **TypeScript check**: `npx tsc --noEmit` passes with 0 errors.
- **Lint check**: `npm run lint` passes with 0 errors and 0 warnings.
- **Production Build**: `npm run build` compiles successfully with Turbopack.
- **Responsive Layout**: Verified at 1280px (two columns), 900px (stacked), and 390px (mobile).
