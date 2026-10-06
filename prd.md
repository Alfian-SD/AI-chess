# PRD: AI Chess Arena

**Status:** Draft v1
**Product type:** Web app (spectator tool)
**UI language:** Indonesian (default), structured for i18n

---

## 1. Summary

AI Chess Arena is a web app where two AI models play a full chess game against each other while the user watches. Its purpose is to make AI reasoning visible: for every move, the user sees the model's real thinking, not a canned or after-the-fact explanation. The user acts as a director, not a player: they pick the models, set the pace, and let the match run.

Tagline in the UI: **"Let them play."** ("Dua pemain, satu pertandingan. Kamu yang atur.")

## 2. Problem and Opportunity

- It is hard to judge how an LLM actually reasons. Chess is a clear, verifiable domain: every move is either legal or not, good or bad.
- Watching two models play shows differences in planning, tactics, and error patterns in a way a single benchmark number cannot.
- Existing chess UIs show moves but not the thinking behind them. Existing LLM playgrounds show thinking but not a game.

## 3. Goals and Non-Goals

### Goals
1. Run a complete AI vs AI chess game automatically, from the first move to a result.
2. Show each model's real reasoning per move, streamed live.
3. Support any OpenAI-compatible provider, with a different model per side.
4. Make matches easy to control (pause, resume, step, reset, speed).
5. Make games shareable and reviewable (PGN, FEN, replay).

### Non-Goals (v1)
- Human vs AI play.
- Online multiplayer or accounts.
- Training or fine-tuning models.
- Building a chess engine. Stockfish is used only for evaluation, not to play.

## 4. Target Users

| Persona | Need |
|---|---|
| AI hobbyist / developer | Compare models by watching them reason on a hard, verifiable task |
| Content creator | Produce watchable AI vs AI games with visible thinking |
| Chess fan | Be entertained by unusual AI play and commentary |

## 5. User Stories

1. As a viewer, I pick White and Black models and press start, and the game plays itself.
2. As a viewer, I read the current model's thinking while it picks a move.
3. As a viewer, I pause the game, step one move at a time, or change the delay between moves.
4. As a viewer, I click an old move and see the board and the reasoning from that point.
5. As a viewer, I export the game as PGN or copy the FEN.
6. As a developer, I add a provider by setting a base URL, API key, and model name.

## 6. Features and Requirements

### 6.1 Match Control (P0)
- Select model for White and Black (provider, model name, display name).
- Start / Continue, Pause, Reset, and "+1 move" (single step).
- **Move delay** setting (e.g. 0, 1s, 2s, 5s).
- **Move limit** setting in plies (default 200); the game ends in a draw by limit when reached.
- Status badge for the match: running, paused, finished, error.

### 6.2 Board (P0)
- Legal rendering of all pieces, coordinates on edges.
- Highlight the last move's squares.
- Flip board, copy FEN, download PGN.
- Player cards above and below the board: avatar, display name, provider, color, and state (thinking / waiting / finished).

### 6.3 Move Commentary and Thinking (P0, core value)
- Show the active model's reasoning for the current move.
- Show a "thinking" state while waiting: "{model} is thinking... {Color} choosing a legal move".
- After the move: show reasoning, the SAN move, move number, and response time in ms.
- **Requirement:** the displayed text is the model's real output (reasoning and/or explanation returned by the API), never invented by the app.
- **Target (P1):** token-by-token streaming of reasoning, and a collapsible full-reasoning view when the model returns long thinking.

### 6.4 Move History (P0)
- Table: move number, White move, Black move, in SAN.
- Auto-scroll to the latest move.
- Click a move to jump the board to that position (P1).

### 6.5 Game Loop and Move Validation (P0)
Per turn:
1. Send the model: FEN, PGN so far, legal moves in SAN, color to play.
2. Ask for reasoning, then a final line `MOVE: <san>`.
3. Parse and validate against the legal move list.
4. If illegal or unparseable: retry up to 3 times, feeding back the error and the legal list. Failed attempts are shown in the commentary, marked as errors.
5. After 3 failures: play a random legal move and label it "forfeit move".
6. Apply the move, update the UI, then wait for the move delay.

Game end conditions: checkmate, stalemate, threefold repetition, fifty-move rule, insufficient material, move limit.

### 6.6 Provider Layer (P0)
- OpenAI-compatible interface: base URL, API key, model name.
- Server-side key storage; keys are never sent to the browser.
- Footer notice in the UI: *"LIVE API: each move uses a provider request."*
- Handle timeouts, rate limits (429), and server errors with exponential backoff; surface clear errors in the UI.

### 6.7 Evaluation (P1)
- Run Stockfish (WASM, in a Web Worker) after each move.
- Show an eval bar and classify moves: Best, Good, Inaccuracy, Mistake, Blunder.

### 6.8 Replay and Saved Games (P1)
- Save finished games as JSON: moves, reasoning, timings, models, result.
- Replay with a timeline slider.
- Export PGN with reasoning as comments.

### 6.9 Scoreboard (P2)
- Win/loss/draw tally per model pairing, average response time, illegal-move rate.

## 7. Data Model (draft)

```
Match {
  id, createdAt, status, result, terminationReason,
  white: PlayerConfig, black: PlayerConfig,
  settings: { moveDelayMs, maxPly },
  moves: Move[]
}

PlayerConfig { displayName, provider, model, baseUrl }

Move {
  ply, color, san, fenAfter,
  reasoning: string,
  attempts: { raw, error? }[],
  latencyMs, tokensIn?, tokensOut?,
  forfeitRandom: boolean,
  evalCp?: number, classification?: string
}
```

## 8. Non-Functional Requirements

- **Performance:** UI stays responsive during streaming; board update under 100 ms after a move is accepted.
- **Reliability:** a failed API call never crashes the match; the match goes to "error" with a Retry action.
- **Security:** API keys only on the server; input from model output is treated as untrusted text (render as plain text, no HTML injection).
- **Cost awareness:** each move is a paid request; show an estimated request count, and allow a token cap per move.
- **Accessibility:** readable contrast, keyboard operation of match controls, board moves announced to screen readers (P2).
- **Responsive:** desktop two-column layout; on mobile, the thinking panel moves below the board.

## 9. Success Metrics

- Games reaching a natural end (not aborted by errors): above 90%.
- Illegal-move rate per model, tracked per game.
- Median response time per move, tracked per model.
- Share of viewers who open the thinking panel on at least one move.

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LLMs often play illegal moves | Provide the legal move list, retry with feedback, forfeit fallback |
| Slow or costly providers | Move delay, token cap, timeouts, clear cost notice |
| "Thinking" not truly available from some models | Label the source: "reasoning" vs "explanation"; never fabricate |
| Very long games | Move limit, repetition and fifty-move rules |
| Key leakage | Server-side proxy only, never in client bundle |

## 11. Milestones

1. **M1 (done / in progress):** Board, match control, history, live API calls, commentary text.
2. **M2:** Streaming thinking, retry and forfeit handling, error states.
3. **M3:** Stockfish eval, move classification, click-to-jump history.
4. **M4:** Saved games, replay, PGN with comments.
5. **M5:** Scoreboard and model comparison stats.

## 12. Open Questions

- Should reasoning be shown in full by default, or collapsed to a short summary plus "show full"?
- Is a spectator-only public link needed, or is this local use only?
- Which providers must be supported at launch beyond OpenAI-compatible?
- Should models see each other's reasoning? (Default: no, only the board and move list.)
