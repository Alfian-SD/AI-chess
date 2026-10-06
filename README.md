# ♚ AI Chess Arena

[![Deploy to GitHub Pages](https://github.com/<user>/<repo>/actions/workflows/deploy.yml/badge.svg)](https://github.com/<user>/<repo>/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **"Let them play."** (*Dua pemain, satu pertandingan. Kamu yang atur.*)

AI Chess Arena is a **100% client-side, zero-backend web application** where two AI language models play complete chess matches against each other while you spectate. The arena makes AI cognition transparent: for every single move, you watch the model's live token-by-token reasoning unfold before it commits to a legal move.

Hosted statically on **GitHub Pages** with zero runtime servers, zero environment variables, and zero bundled API keys.

---

## 🌐 Live Demo & Preview

- **Live Site:** [https://<user>.github.io/<repo>/](https://<user>.github.io/<repo>/) *(Replace with your GitHub username and repository name)*
- **Demo Screenshot:**

```
+-------------------------------------------------------------+
|  BLACK: Claude 3.5 Sonnet              MATCH CONTROL        |
|  [ 8x8 CHESSBOARD & EVAL BAR ]         [ Continue ] [Step]  |
|  WHITE: GPT-4o                         MOVE COMMENTARY      |
|  [ Flip Board ] [ Copy FEN ]           Thinking token stream|
+-------------------------------------------------------------+
```

---

## ✨ Features

- **Visible Live Reasoning:** Token-by-token streaming of the active model's raw tactical and positional thoughts (`reasoning_content` or standard chain-of-thought).
- **Any OpenAI-Compatible Endpoint:** Connect OpenAI, OpenRouter, Together AI, or local offline LLMs running via **Ollama** or **LM Studio**.
- **Different Models per Side:** Pit GPT-4o against Claude 3.5 Sonnet, DeepSeek R1 against Llama 3.3, or benchmark two different temperatures of the same model.
- **Stockfish WASM Evaluation:** Runs real-time evaluation (centipawns & mate depth) via an in-browser Web Worker using single-threaded Stockfish WASM.
- **Match Controls:** Play, pause, step forward (+1 move), adjust move delays (0ms to 5s), and set max plies.
- **Opening Repertoire:** Includes theoretical opening lines (Ruy Lopez, Sicilian, Italian, Queen's Gambit, French, etc.) to set up exciting board positions.
- **Replay & PGN / JSON Export:** Replay finished matches with a timeline scrubber, download PGN with embedded reasoning comments, or export/import saved games as JSON.
- **Scoreboard:** Tracks head-to-head match stats, average latency, and illegal move rates in browser storage.
- **Offline Mock Provider:** Built-in simulation mode for UI testing without entering any API keys, clearly labeled `[MOCK]`.
- **Honest First-Run Experience:** No fake moves or silent demos. The arena clearly requests endpoint configuration before starting.

---

## 🔒 Security & Privacy Architecture

This project is deliberately designed to protect your API keys and credentials:

1. **No Backend Server:** The application is purely static HTML, CSS, and JavaScript served by GitHub Pages. There are no server routes, proxies, or databases.
2. **Direct Browser-to-Provider Fetch:** All API requests are made directly from your browser's `fetch()` API to the endpoint you configure.
3. **Session-Only Storage by Default:** Credentials are kept in browser memory and `sessionStorage` (automatically wiped when you close the tab).
4. **Optional Local Storage:** If you choose "Remember on this device", settings are stored in `localStorage` with a visible warning.
5. **Masked Keys:** Keys in the UI are masked after entry (showing only the last 4 characters).
6. **Zero Credential Leakage:** API keys are never included in exported PGNs, game JSON logs, error alerts, query strings, or console logs.
7. **Strict Content Security Policy (CSP):** Blocks external inline scripts, third-party trackers, and untrusted network origins.

---

## 🚀 Running Locally

Ensure you have **Node.js 18+** installed.

```bash
# 1. Clone the repository
git clone https://github.com/<user>/<repo>.git
cd <repo>

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Building and Previewing Static Production Build

```bash
# Build static files into /dist
npm run build

# Preview static distribution under a subpath (mimics GitHub Pages)
npx vite preview --base /ai-chess-arena/
```

---

## 🛠️ Configuring Endpoints in Settings

Click the **Settings** button in the header or the player names in Match Control:

| Field | Description | Example |
|---|---|---|
| **Display Name** | Label shown on player card and PGN | `Grandmaster White` |
| **Endpoint Base URL** | OpenAI-compatible API base URL | `https://api.openai.com/v1`, `http://localhost:11434/v1` |
| **API Key** | Secret key for the provider (stored only in browser) | `sk-...` |
| **Model Name** | Exact model ID | `gpt-4o`, `anthropic/claude-3.5-sonnet`, `llama3.2` |
| **Temperature** | Sampling variety (0.0 to 1.2) | `0.7` |
| **Test Connection** | Sends a tiny 1-token test request to verify URL, key, and CORS | Status & latency in ms |

---

## 🌐 CORS Notes (Browser Cross-Origin Requests)

Because AI Chess Arena runs directly in the browser, your configured endpoint must support **Cross-Origin Resource Sharing (CORS)** headers (`Access-Control-Allow-Origin`).

### Local Providers:
- **Ollama:** By default, Ollama restricts requests from browser origins. Set `OLLAMA_ORIGINS="*"` when starting Ollama:
  - *macOS/Linux:* `OLLAMA_ORIGINS="*" ollama serve`
  - *Windows (PowerShell):* `$env:OLLAMA_ORIGINS="*"; ollama serve`
- **LM Studio:** Go to **Developer Settings** (local server tab) and enable the **"Enable CORS"** checkbox.

### Cloud Providers:
- Most commercial providers (OpenRouter, Together AI, Groq) allow browser CORS requests by default.
- If using official OpenAI endpoints directly from client browsers, certain browser privacy extensions or ad-blockers might intercept requests. Use OpenRouter or a local CORS proxy if needed.

---

## 🚢 Deploying to GitHub Pages

This repository includes a turnkey GitHub Actions workflow (`.github/workflows/deploy.yml`). No secrets or API keys are needed!

1. Push your clean repository to GitHub.
2. Go to your repository **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. Push to the `main` branch. GitHub Actions will build and deploy `dist/` to `https://<user>.github.io/<repo>/`.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **"Connection failed (CORS or network error)"** | Endpoint blocked browser cross-origin requests. | Enable CORS on your local provider (`OLLAMA_ORIGINS="*"`) or verify network URL. |
| **"HTTP 401 Unauthorized"** | Invalid or missing API key. | Check your API key in Settings for that player. |
| **"HTTP 404 Not Found"** | Base URL or model name invalid. | Ensure URL ends with `/v1` (e.g. `http://localhost:11434/v1`). |
| **Stockfish Eval not moving** | Web Worker / WASM blocked. | GitHub Pages requires single-threaded WASM without SharedArrayBuffer (already bundled). Check browser console. |
| **Match stops with "Error"** | Provider returned an error or illegal move. | Click **"Coba Lagi (Retry)"** or open Settings to reconfigure. |

---

## 📜 Credits & Third-Party Licenses

- **[Stockfish](https://stockfishchess.org/)**: The world's leading open-source chess engine. Included as a single-threaded WebAssembly / Emscripten build (`stockfish.js`) under the [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html). Source code available at [official Stockfish repository](https://github.com/official-stockfish/Stockfish).
- **[chess.js](https://github.com/jhlywa/chess.js)**: Chess rules and move validation library, licensed under the [BSD 2-Clause License](https://opensource.org/licenses/BSD-2-Clause).
- **[react-chessboard](https://github.com/Clariity/react-chessboard)**: Chessboard UI component, licensed under the [MIT License](https://opensource.org/licenses/MIT).
- **[Lucide Icons](https://lucide.dev)**: UI iconography, licensed under the [ISC License](https://opensource.org/licenses/ISC).
- **Piece Images**: AI-generated original chess piece assets located in `public/pieces/`. Free to use and distribute under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
