import { PlayerConfig } from './types';

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  hint?: string;
}

export interface StreamTurnParams {
  fen: string;
  pgn: string;
  color: 'w' | 'b';
  legalMoves: string[];
  player: PlayerConfig;
  attemptNumber: number;
  previousError?: string;
  gameId?: string;
  moveNumber?: number;
  isRepeatedPosition?: boolean;
  abortSignal?: AbortSignal;
}

export interface StreamTurnResult {
  fullOutput: string;
  reasoning: string;
  reasoningType: 'reasoning' | 'explanation';
  latencyMs: number;
  source: 'LIVE' | 'MOCK';
  tokensIn?: number;
  tokensOut?: number;
}

/**
 * Builds request headers from player configuration.
 * Never logs keys to console.
 */
function buildHeaders(player: PlayerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (player.apiKey && player.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${player.apiKey.trim()}`;
  }

  if (player.extraHeaders && player.extraHeaders.trim()) {
    try {
      const custom = JSON.parse(player.extraHeaders.trim());
      if (typeof custom === 'object' && custom !== null) {
        Object.assign(headers, custom);
      }
    } catch {
      // Ignore invalid JSON in extraHeaders
    }
  }

  return headers;
}

/**
 * Test an endpoint by sending a tiny test request from the browser.
 * Provides specific diagnostics for CORS failures, 401s, 404s, and timeouts.
 */
export async function testEndpointConnection(player: PlayerConfig): Promise<TestConnectionResult> {
  if (player.provider === 'mock') {
    return {
      success: true,
      latencyMs: 15,
      hint: 'Mock provider operates entirely offline in your browser.',
    };
  }

  const rawBaseUrl = player.baseUrl?.trim();
  if (!rawBaseUrl) {
    return {
      success: false,
      latencyMs: 0,
      error: 'Base URL is required (e.g. https://api.openai.com/v1 or http://localhost:11434/v1).',
    };
  }

  const cleanBase = rawBaseUrl.replace(/\/+$/, '');
  const url = `${cleanBase}/chat/completions`;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const headers = buildHeaders(player);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: player.model.trim() || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        latencyMs,
        status: response.status,
      };
    }

    const errorBody = await response.text().catch(() => '');
    let parsedMessage = errorBody;
    try {
      const json = JSON.parse(errorBody);
      if (json?.error?.message) {
        parsedMessage = json.error.message;
      }
    } catch {
      // Keep raw body
    }

    if (response.status === 401) {
      return {
        success: false,
        latencyMs,
        status: 401,
        error: `HTTP 401 Unauthorized: Invalid API key. (${parsedMessage || 'Authentication rejected'})`,
        hint: 'Please check the API key you entered for this player.',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        latencyMs,
        status: 404,
        error: `HTTP 404 Not Found: ${parsedMessage || 'Endpoint or model not found.'}`,
        hint: `Check that your base URL ends with '/v1' and that model '${player.model}' exists on this provider.`,
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        latencyMs,
        status: 429,
        error: `HTTP 429 Rate Limit: ${parsedMessage || 'Quota exceeded.'}`,
        hint: 'Your provider quota may be exhausted or request rate is too fast.',
      };
    }

    return {
      success: false,
      latencyMs,
      status: response.status,
      error: `HTTP ${response.status}: ${parsedMessage || response.statusText}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        success: false,
        latencyMs,
        error: 'Connection timed out after 12 seconds.',
        hint: 'The endpoint did not respond. Check your network or server URL.',
      };
    }

    // Typical browser CORS or network error symptom
    return {
      success: false,
      latencyMs,
      error: 'Connection failed (CORS or network error).',
      hint:
        'The browser was blocked from connecting to this endpoint. ' +
        '1) If using local Ollama, ensure it allows browser origins by setting OLLAMA_ORIGINS="*" before starting ollama serve. ' +
        '2) If using LM Studio, enable "CORS" in Developer Settings. ' +
        '3) For public APIs, verify you are not blocked by browser privacy shields or an invalid protocol.',
    };
  }
}

/**
 * Stream an AI move turn directly from the browser using standard fetch and SSE parsing.
 */
export async function streamModelTurn(
  params: StreamTurnParams,
  onChunk: (text: string) => void
): Promise<StreamTurnResult> {
  const {
    fen,
    pgn,
    color,
    legalMoves,
    player,
    attemptNumber,
    previousError,
    gameId = 'arena_game',
    moveNumber = 1,
    isRepeatedPosition = false,
    abortSignal,
  } = params;

  const colorName = color === 'w' ? 'White' : 'Black';

  // 1. Mock provider handler (runs entirely client-side when explicitly chosen)
  if (player.provider === 'mock') {
    return runMockStream(player, colorName, legalMoves, attemptNumber, onChunk, gameId);
  }

  // 2. Real provider validation
  const cleanBase = player.baseUrl?.trim().replace(/\/+$/, '');
  if (!cleanBase) {
    throw new Error(
      `Endpoint URL missing for ${player.displayName || colorName}. Please open Settings to configure the provider base URL.`
    );
  }

  if (!player.model?.trim()) {
    throw new Error(
      `Model name missing for ${player.displayName || colorName}. Please open Settings to configure the model.`
    );
  }

  // Cloud providers require an API key
  const isLocal = player.provider === 'ollama' || player.provider === 'lmstudio' || cleanBase.includes('localhost') || cleanBase.includes('127.0.0.1');
  if (!isLocal && !player.apiKey?.trim()) {
    throw new Error(
      `API key missing for ${player.displayName || colorName}. Please open Settings and enter your API key.`
    );
  }

  // Clamped temperature [0.0, 1.2]
  const tempInput = typeof player.temperature === 'number' && !isNaN(player.temperature) ? player.temperature : 0.7;
  const actualTemperature = Math.max(0, Math.min(1.2, tempInput));

  // Construct prompts
  const systemPrompt = `You are a Grandmaster chess engine playing as ${colorName}.
[Session: Game ID ${gameId}, Ply ${moveNumber}]
Analyze the position thoroughly: evaluate opponent threats, king safety, piece activity, candidate lines, and tactical ideas.
You MUST provide your reasoning first.
On your very final line, output ONLY your chosen move in Standard Algebraic Notation (SAN):
MOVE: <san>

Rules:
1. You MUST select a move exclusively from this legal move list in Standard Algebraic Notation:
${legalMoves.join(', ')}
2. Your very last line MUST strictly follow the exact format "MOVE: <san>" with no trailing explanation.`;

  let userPrompt = `[Metadata: Game ID ${gameId}, Turn ${moveNumber}]
Current board FEN: ${fen}
PGN history so far:
${pgn || '(start of game)'}

Your turn as ${colorName}. Legal moves:
${legalMoves.join(', ')}`;

  if (isRepeatedPosition) {
    userPrompt += `\n\n[WARNING - POSITION REPEATED]: This exact board position has occurred twice already. To avoid a draw by repetition, play an active, non-repeating legal move.`;
  }

  if (previousError) {
    userPrompt += `\n\n[CRITICAL RETRY ATTEMPT ${attemptNumber}]: Your previous output failed with error: "${previousError}".
Choose a valid move strictly from this legal move list:
${legalMoves.join(', ')}
End your response with:
MOVE: <san>`;
  }

  const requestPayload: Record<string, unknown> = {
    model: player.model.trim(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    temperature: actualTemperature,
    max_tokens: player.maxTokens || 1024,
  };

  if (player.seed !== undefined && player.seed !== null && !isNaN(player.seed)) {
    requestPayload.seed = Math.floor(player.seed);
  }

  const startTime = Date.now();
  const url = `${cleanBase}/chat/completions`;
  const headers = buildHeaders(player);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
      signal: abortSignal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request was aborted.');
    }
    // Network / CORS error
    throw new Error(
      `Failed to connect to ${cleanBase}. If using a local model, verify CORS is enabled (e.g. OLLAMA_ORIGINS="*"). If cloud provider, check network connectivity and URL.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let msg = errorText;
    try {
      const json = JSON.parse(errorText);
      if (json?.error?.message) {
        msg = json.error.message;
      }
    } catch {
      // keep msg
    }

    if (response.status === 401) {
      throw new Error(`Invalid API key (HTTP 401): ${msg || 'Unauthorized'}`);
    }
    if (response.status === 404) {
      throw new Error(`Endpoint or model '${player.model}' not found (HTTP 404): ${msg}`);
    }
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded (HTTP 429): ${msg}`);
    }
    throw new Error(`Provider error (HTTP ${response.status}): ${msg || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Provider returned empty response body.');
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReasoning = '';
  let fullContent = '';
  let hasSeparateReasoning = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        if (trimmed === 'data: [DONE]') continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Check for reasoning content (DeepSeek R1, OpenAI o1/o3)
          const reasoningDelta = delta.reasoning_content || delta.reasoning;
          if (reasoningDelta) {
            hasSeparateReasoning = true;
            fullReasoning += reasoningDelta;
            onChunk(reasoningDelta);
          }

          if (delta.content) {
            fullContent += delta.content;
            onChunk(delta.content);
          }
        } catch {
          // Ignore chunk JSON parse issues
        }
      }
    }
  } catch (readErr: unknown) {
    if (readErr instanceof DOMException && readErr.name === 'AbortError') {
      throw new Error('Streaming was paused or aborted.');
    }
    throw readErr;
  }

  const latencyMs = Date.now() - startTime;
  const outputReasoning = hasSeparateReasoning ? fullReasoning : fullContent;
  const reasoningType = hasSeparateReasoning ? 'reasoning' : 'explanation';

  return {
    fullOutput: fullContent || fullReasoning,
    reasoning: outputReasoning,
    reasoningType,
    latencyMs,
    source: 'LIVE',
  };
}

/**
 * Offline simulation for testing UI without API keys.
 */
async function runMockStream(
  player: PlayerConfig,
  colorName: string,
  legalMoves: string[],
  attemptNumber: number,
  onChunk: (text: string) => void,
  gameId: string
): Promise<StreamTurnResult> {
  const startTime = Date.now();
  const isForceIllegal = player.model === 'mock-illegal' && attemptNumber <= 2;

  let chosenMove: string;
  if (isForceIllegal) {
    chosenMove = 'Kx10#';
  } else {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    chosenMove = legalMoves[randomIndex] || 'e4';
  }

  const thoughts = [
    `[MOCK ENGINE] Evaluating position for ${colorName} in game ${gameId}.`,
    `Analyzing ${legalMoves.length} candidate lines.`,
    `Reviewing key options: ${legalMoves.slice(0, 4).join(', ')}.`,
    isForceIllegal
      ? `Simulating an invalid move to demonstrate retry and error handling.`
      : `Selecting tactical move '${chosenMove}' for solid board control.`,
    `Verification complete.`,
    `\nMOVE: ${chosenMove}`,
  ];

  const fullText = thoughts.join('\n');
  const chunks = fullText.split(' ');

  for (let i = 0; i < chunks.length; i++) {
    const word = chunks[i] + (i === chunks.length - 1 ? '' : ' ');
    onChunk(word);
    await new Promise((r) => setTimeout(r, 25));
  }

  return {
    fullOutput: fullText,
    reasoning: fullText,
    reasoningType: 'explanation',
    latencyMs: Date.now() - startTime,
    source: 'MOCK',
  };
}
