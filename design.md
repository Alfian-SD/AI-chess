# Design: AI Chess Arena

Design spec derived from the current UI. Values are close approximations from the screenshot; tune them against the real CSS.

---

## 1. Design Principles

1. **The game is the stage, the thinking is the story.** Board on the left, commentary right next to it, never hidden.
2. **Calm and dark.** A near-black canvas with a muted olive palette, so the board and text carry the focus.
3. **Technical but friendly.** Monospace micro-labels for data, a clean sans for reading, a small mascot for warmth.
4. **State is always visible.** Whose turn it is, whether the model is thinking, and whether the match is running should be readable at a glance.

## 2. Layout

Two-column desktop layout, centered, max width about 1100 px.

```
+--------------------------------------+--------------------------+
| Player card (Black)                  |  MATCH CONTROL           |
| +----------------------------------+ |  headline, subtitle      |
| |            Board 8x8             | |  players row             |
| |                                  | |  selects, buttons        |
| +----------------------------------+ +--------------------------+
| Player card (White)                  |  MOVE COMMENTARY         |
| [Flip] [Copy FEN] [Download PGN]     +--------------------------+
|                                      |  MOVE HISTORY            |
+--------------------------------------+--------------------------+
```

- Left column: about 480 px wide (board is square).
- Right column: about 375 px wide, stacked cards with 16 px gap.
- Column gap: about 24 px.
- The mascot sits fixed at the bottom-left of the viewport, decorative.

**Responsive**
- Under about 900 px: single column. Order: Black card, board, White card, board actions, Match control, Commentary, History.
- The board scales to the container width and stays square.

## 3. Color Tokens

| Token | Approx. value | Use |
|---|---|---|
| `--bg` | `#0d0d0d` | Page background |
| `--surface` | `#141414` | Cards |
| `--surface-2` | `#1b1b1b` | Inputs, secondary buttons |
| `--border` | `#2a2a2a` | Card and input borders |
| `--text` | `#e9e9e4` | Primary text |
| `--text-muted` | `#8a8a84` | Secondary text, labels |
| `--accent` | `#7d8a5e` | Primary button, running state (olive) |
| `--accent-strong` | `#9aa874` | Highlights, active indicator |
| `--board-light` | `#e6e8d5` | Light squares |
| `--board-dark` | `#6e7d57` | Dark squares |
| `--move-highlight` | `#b9bd5a` | Last-move squares |
| `--thinking-dot` | `#c9c04a` | Live "thinking" dot |
| `--danger` | `#c0564b` | Illegal move, errors |

Pieces: classic filled set; white pieces light with a dark outline, black pieces dark.

## 4. Typography

| Role | Style |
|---|---|
| Headline ("Let them play.") | Sans, 24 to 28 px, semibold, tight tracking |
| Body / commentary text | Sans, 13 to 14 px, line height 1.5, `--text` |
| Subtitle, helper text | Sans, 13 px, `--text-muted` |
| Micro labels ("MATCH CONTROL", "MOVE HISTORY") | Monospace, 10 to 11 px, uppercase, letter spacing 0.12em, `--text-muted` |
| Data (ply counts, ms, move numbers) | Monospace, 11 px |
| Player name | Sans, 14 px, medium |
| Player meta ("OPENAI - HITAM") | Monospace, 10 px, uppercase, muted |

## 5. Components

### 5.1 Player Card
- Height about 44 px, row layout: avatar (32 px rounded square), name and meta stacked, state badge on the right.
- Avatar: king icon, light tile for White, dark tile for Black.
- State badge (monospace, uppercase, 10 px, 1 px border, 4 px radius):
  - **BERPIKIR...** (thinking): olive fill tint, `--accent-strong` text.
  - **MENUNGGU** (waiting): transparent, muted text and border.
  - **SELESAI** (finished) and **ERROR**: variants using text and `--danger`.

### 5.2 Board
- 8 x 8 squares, 1 px inner border around the board, 4 px outer radius, soft outer frame.
- Coordinates: file letters bottom row, rank numbers left column, 9 to 10 px monospace inside the edge squares, color contrasts with the square.
- Last-move highlight: both squares use `--move-highlight` (from and to).
- Piece movement: 150 to 200 ms slide animation.
- Under the board: text buttons with small icons: "Putar papan" (flip), "Salin FEN" (copy), "Unduh PGN" (download). Muted, 11 px, centered row.

### 5.3 Match Control Card
- Header row: micro label "MATCH CONTROL" left, status badge right ("BERJALAN" = running, green outline).
- Headline: "Let them play."
- Subtitle: "Dua pemain, satu pertandingan. Kamu yang atur."
- Divider, then the players row: white dot + White name, "VS" (muted, mono), grey dot + Black name.
- Two selects side by side: **Jeda langkah** (move delay) and **Batas langkah** (move limit). Dark input, 1 px border, 8 px radius, chevron icon.
- Primary button (full width, 44 px): olive fill, play icon, "Lanjutkan pertandingan" (Continue match). When running, it changes to a pause state or is disabled.
- Secondary row, three equal buttons: **Pause**, **Reset**, **+1 langkah** (step). Dark fill, 1 px border, 8 px radius. Disabled state at 40% opacity.
- Footer note, centered, mono, 10 px, muted: "LIVE API - Setiap langkah menggunakan request provider".

### 5.4 Move Commentary Card
- Header: micro label "MOVE COMMENTARY", right side a small live dot (`--thinking-dot`, pulsing while a model is thinking).
- Active model row: piece avatar (knight icon in olive circle), model name with state ("sedang berpikir..."), small meta line ("Hitam - memilih langkah legal").
- Body: reasoning text, 13 to 14 px, wraps; shows a fixed-height area (about 120 px) with internal scroll.
- Footer row (mono, 10 px, muted): left "LANGKAH 19 - Nxe5", right latency "5.342 ms".
- Error attempts appear as red-tinted lines above the final text.
- Planned: "Show full reasoning" expander and token-by-token streaming.

### 5.5 Move History Card
- Header: micro label "MOVE HISTORY", right side ply count ("19 ply").
- Table header row (mono, muted): `#`, `PUTIH` (White), `HITAM` (Black).
- Rows: move number in mono muted, SAN moves in mono `--text`; current move highlighted with `--accent` tint background.
- Fixed-height scroll area; auto-scroll to the newest row; rows are clickable (jump to position).

### 5.6 Mascot
- Small blue robot character, bottom-left, about 64 px, fixed. Decorative only (`aria-hidden`). Hide on mobile to save space.

## 6. States

| State | UI behavior |
|---|---|
| Idle (not started) | Primary button "Mulai pertandingan"; both players "MENUNGGU"; empty commentary with a hint |
| Running | Match badge "BERJALAN"; active player badge "BERPIKIR..."; live dot pulsing |
| Paused | Match badge "DIJEDA"; primary button "Lanjutkan pertandingan"; step button enabled |
| Finished | Match badge shows result (e.g. "1-0", "1/2-1/2"); final commentary card shows the termination reason; Download PGN highlighted |
| Error | Match badge "ERROR" in `--danger`; inline message with a Retry button; match state preserved |
| Forfeit move | Commentary line tagged "FORFEIT MOVE" in `--danger` with the reason |

## 7. Interaction and Motion

- Piece slide: 150 to 200 ms ease-out.
- Last-move highlight fades in over 120 ms.
- Live dot pulse: 1.2 s loop, only while thinking.
- Button hover: lighten the fill by about 6%; focus: 2 px `--accent-strong` outline.
- Respect `prefers-reduced-motion`: disable the slide and the pulse.

## 8. Content and Localization

- Default language: Indonesian; keep all strings in a dictionary (id, en) for easy switching.
- Examples: "Jeda langkah" / "Move delay", "Batas langkah" / "Move limit", "Putar papan" / "Flip board", "Salin FEN" / "Copy FEN", "Unduh PGN" / "Download PGN", "Lanjutkan pertandingan" / "Continue match", "sedang berpikir..." / "is thinking...".
- Model reasoning is shown in whatever language the model returns; do not translate it automatically.

## 9. Accessibility

- Text contrast at least 4.5:1 against its surface (check muted text, which is near the limit).
- All controls keyboard-focusable with a visible focus ring.
- Board: provide an `aria-live="polite"` region announcing the latest move ("Black plays Nxe5").
- State is never conveyed by color alone: badges always carry text.
- Commentary container: `role="log"` so assistive tech reads new reasoning.

## 10. Suggested CSS Variables

```css
:root {
  --bg: #0d0d0d;
  --surface: #141414;
  --surface-2: #1b1b1b;
  --border: #2a2a2a;
  --text: #e9e9e4;
  --text-muted: #8a8a84;
  --accent: #7d8a5e;
  --accent-strong: #9aa874;
  --board-light: #e6e8d5;
  --board-dark: #6e7d57;
  --move-highlight: #b9bd5a;
  --thinking-dot: #c9c04a;
  --danger: #c0564b;

  --radius-card: 12px;
  --radius-control: 8px;
  --gap: 16px;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

## 11. Future Design Work

- Eval bar beside the board (vertical, light/dark split).
- Move quality tags (Best, Blunder) as small colored chips in history.
- Timeline slider for replay mode.
- Side-by-side thinking panels (one per model) as an alternative layout.
