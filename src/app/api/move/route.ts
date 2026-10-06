import { NextRequest } from 'next/server';

interface MoveRequestBody {
  fen: string;
  pgn: string;
  color: 'w' | 'b';
  legalMoves: string[];
  player: {
    displayName: string;
    provider: string;
    model: string;
    baseUrl?: string;
    apiKey?: string;
  };
  attemptNumber: number;
  previousError?: string;
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let body: MoveRequestBody;

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { fen, pgn, color, legalMoves, player, attemptNumber, previousError } = body;
  const colorName = color === 'w' ? 'White' : 'Black';

  // Check if player uses mock mode
  const isMock = player.provider === 'mock' || (!player.apiKey && !process.env.OPENAI_API_KEY && !player.baseUrl);

  if (isMock) {
    return handleMockStream(player, colorName, legalMoves, attemptNumber, previousError, startTime);
  }

  // Resolve API key and Base URL
  const apiKey = player.apiKey || process.env.OPENAI_API_KEY || '';
  const baseUrl = (player.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const modelName = player.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Construct system and user prompt
  const systemPrompt = `You are an elite Grandmaster chess engine playing as ${colorName}.
Your goal is to evaluate the position deeply and choose the strongest move.
You MUST reason first: analyze opponent threats, tactical opportunities, candidate moves, and positional goals.
Your output must end with your chosen legal move on the final line in exact format:
MOVE: <san>

Rules:
1. You MUST select a move exclusively from this legal move list in Standard Algebraic Notation (SAN):
${legalMoves.join(', ')}
2. Your very last line MUST be strictly "MOVE: <san>" with no trailing text.`;

  let userPrompt = `Current board FEN: ${fen}\nPGN history so far:\n${pgn || '(start of game)'}\n\nYour turn as ${colorName}. Legal moves: ${legalMoves.join(', ')}`;
  if (previousError) {
    userPrompt += `\n\n[CRITICAL WARNING - RETRY ATTEMPT ${attemptNumber}]: Your previous attempt was REJECTED with error: "${previousError}".
You must choose a valid move ONLY from this list:
${legalMoves.join(', ')}
End your output with:
MOVE: <san>`;
  }

  const encoder = new TextEncoder();

  try {
    // Retry with exponential backoff for 429 / network errors
    const fetchWithBackoff = async (retries = 2, delay = 1000): Promise<Response> => {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            stream: true,
            temperature: 0.3,
          }),
        });

        if (response.status === 429 || response.status >= 500) {
          if (retries > 0) {
            await new Promise((r) => setTimeout(r, delay));
            return fetchWithBackoff(retries - 1, delay * 2);
          }
        }
        return response;
      } catch (err) {
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, delay));
          return fetchWithBackoff(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    const upstreamRes = await fetchWithBackoff();

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return new Response(
        JSON.stringify({ error: `Provider error (${upstreamRes.status}): ${errText}` }),
        { status: upstreamRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!upstreamRes.body) {
      return new Response(JSON.stringify({ error: 'No response body from provider' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamRes.body!.getReader();
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

                // Check for separate reasoning field (o1, o3, deepseek, etc.)
                const reasoningDelta = delta.reasoning_content || delta.reasoning;
                if (reasoningDelta) {
                  hasSeparateReasoning = true;
                  fullReasoning += reasoningDelta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: reasoningDelta, source: 'reasoning' })}\n\n`)
                  );
                }

                // Standard content field
                if (delta.content) {
                  fullContent += delta.content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: delta.content, source: 'content' })}\n\n`)
                  );
                }
              } catch {
                // Ignore parse errors on individual SSE chunks
              }
            }
          }

          const latencyMs = Date.now() - startTime;
          const outputReasoning = hasSeparateReasoning ? fullReasoning : fullContent;
          const reasoningType = hasSeparateReasoning ? 'reasoning' : 'explanation';

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                fullOutput: fullContent,
                reasoning: outputReasoning,
                reasoningType,
                latencyMs,
              })}\n\n`
            )
          );
          controller.close();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Stream read error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Failed to call provider';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handlers for mock simulation
function handleMockStream(
  player: { displayName: string; model: string },
  colorName: string,
  legalMoves: string[],
  attemptNumber: number,
  previousError?: string,
  startTime: number = Date.now()
) {
  const encoder = new TextEncoder();
  const isForceIllegal = player.model === 'mock-illegal' && attemptNumber <= 3;

  // Choose a move
  let chosenMove: string;
  if (isForceIllegal) {
    chosenMove = 'Kx10#'; // Blatantly illegal move for testing retry & forfeit
  } else {
    // Prefer tactical or center moves if available
    const centerMoves = ['e4', 'd4', 'e5', 'd5', 'Nf3', 'Nc6', 'Nf6', 'c4', 'c5'];
    const preferred = legalMoves.find((m) => centerMoves.includes(m));
    chosenMove = preferred || legalMoves[Math.floor(Math.random() * legalMoves.length)] || 'e4';
  }

  // Generate realistic GM reasoning
  const simulatedThoughts = [
    `Assessing current position as ${colorName}.`,
    `Evaluating center control, piece coordination, and pawn structure.`,
    `Examining candidate moves: ${legalMoves.slice(0, 4).join(', ')}.`,
    isForceIllegal
      ? `Simulating an invalid move attempt to verify retry and forfeit handling.`
      : `Move '${chosenMove}' offers the most dynamic pressure and solid tactical soundness.`,
    `Final decision verified against legal candidates.`,
    `\nMOVE: ${chosenMove}`,
  ];

  const fullText = simulatedThoughts.join('\n');

  const stream = new ReadableStream({
    async start(controller) {
      const chunks = fullText.split(' ');
      for (let i = 0; i < chunks.length; i++) {
        const word = chunks[i] + (i === chunks.length - 1 ? '' : ' ');
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: word, source: 'content' })}\n\n`)
        );
        // Small delay between tokens to give genuine streaming feel (20-40ms)
        await new Promise((r) => setTimeout(r, 25));
      }

      const latencyMs = Date.now() - startTime;
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'done',
            fullOutput: fullText,
            reasoning: fullText,
            reasoningType: 'explanation',
            latencyMs,
          })}\n\n`
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
