# Security Policy

## Architecture & Credential Handling

AI Chess Arena is built as a **fully static, client-side application** hosted directly on GitHub Pages. It has **no backend server**, no proxy layer, and no analytics or tracking telemetry.

### How API Keys are Handled
- **Browser-Only Storage:** API keys and endpoint credentials entered into the Settings dialog remain strictly inside your local browser. By default, they are stored in `sessionStorage` (which is immediately purged when you close your browser tab).
- **Optional Local Storage:** If you explicitly check "Remember on this device", settings are stored in your browser's `localStorage` unencrypted. A "Clear all settings" button is provided to wipe credentials on demand.
- **Direct Browser-to-Endpoint Fetching:** Your browser communicates directly with the custom endpoint URL you configure (e.g. `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, or `http://localhost:11434/v1`). Keys are never relayed through any intermediary server.
- **Zero Key Leakage in Exports:** API keys are never written to exported PGNs, game JSON logs, scoreboard exports, URL query parameters, or console logs.

### Content Security Policy (CSP)
The application enforces a strict Content Security Policy meta tag:
- Blocks execution of untrusted third-party scripts.
- Blocks external web fonts and trackers.
- Restricts `connect-src` to secure HTTPS endpoints and local servers (`localhost` / `127.0.0.1`).
- Renders all model output as plain text (no HTML injection or `dangerouslySetInnerHTML`).

## Reporting a Vulnerability

If you discover a security vulnerability or credential handling concern, please do NOT file a public issue.

Instead, please report it via GitHub Private Vulnerability Reporting on this repository, or contact the project maintainer via:
- GitHub Security Advisory: `https://github.com/<user>/<repo>/security/advisories/new`
- Email: `[security contact email / maintainer contact]`

Reports are reviewed promptly and fixes are prioritized.
