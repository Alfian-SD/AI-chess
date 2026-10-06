# Contributing to AI Chess Arena

Thank you for your interest in contributing to AI Chess Arena! We welcome contributions, bug reports, and enhancements.

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/<user>/ai-chess-arena.git
   cd ai-chess-arena
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build and preview locally:
   ```bash
   npm run build
   npm run preview
   ```

5. Run linting and type checking:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```

## Contribution Guidelines

- **No Secrets / No .env:** This project is a pure client-side application. Do NOT commit `.env` files or hardcode API keys or secret tokens.
- **Client-Side Only:** All features must function statically in modern browsers without requiring a backend runtime.
- **Plain Text Model Rendering:** Never use `dangerouslySetInnerHTML` for model reasoning or output text.
- **Stockfish Compatibility:** Keep Stockfish single-threaded WASM to maintain compatibility with GitHub Pages (which does not provide COOP/COEP isolation headers).

## Submitting a Pull Request

1. Create a feature branch (`git checkout -b feature/amazing-feature`).
2. Ensure `npm run build` and `npm run lint` succeed without errors.
3. Open a Pull Request with a clear description of the changes and testing steps.
