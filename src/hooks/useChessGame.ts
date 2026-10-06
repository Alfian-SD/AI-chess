'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Chess, Move } from 'chess.js';
import {
  Match,
  MatchStatus,
  PlayerConfig,
  PlayerColor,
  MoveRecord,
  MoveAttempt,
  MatchSettings,
} from '../lib/types';
import {
  createChessInstance,
  getLegalMoves,
  parseModelMove,
  validateMove,
  getRandomLegalMove,
  checkGameEnd,
  getCapturedPieces,
  exportPgnWithComments,
} from '../lib/chess-engine';
import { saveMatch } from '../lib/storage';
import { useStockfish } from './useStockfish';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const DEFAULT_SETTINGS: MatchSettings = {
  moveDelayMs: 1000,
  maxPly: 200,
};

const DEFAULT_WHITE: PlayerConfig = {
  displayName: 'GPT-4o',
  provider: 'mock',
  model: 'gpt-4o',
};

const DEFAULT_BLACK: PlayerConfig = {
  displayName: 'Claude 3.5 Sonnet',
  provider: 'mock',
  model: 'claude-3-5-sonnet',
};

export function useChessGame() {
  const chessRef = useRef<Chess>(createChessInstance());
  const { evaluatePosition, currentEval } = useStockfish();

  const [match, setMatch] = useState<Match>(() => ({
    id: `match_${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'idle',
    white: DEFAULT_WHITE,
    black: DEFAULT_BLACK,
    settings: DEFAULT_SETTINGS,
    moves: [],
    currentFen: START_FEN,
    activeColor: 'w',
  }));

  const [liveReasoning, setLiveReasoning] = useState<string>('');
  const [liveReasoningType, setLiveReasoningType] = useState<'reasoning' | 'explanation'>('explanation');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentAttempts, setCurrentAttempts] = useState<MoveAttempt[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [previewPly, setPreviewPly] = useState<number | null>(null);

  // Status and execution refs to avoid closure stale issues in async loops
  const matchStatusRef = useRef<MatchStatus>('idle');
  const matchRef = useRef<Match>(match);
  const isExecutingRef = useRef<boolean>(false);
  const executeTurnRef = useRef<(isSingleStep?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    matchStatusRef.current = match.status;
    matchRef.current = match;
  }, [match]);

  // Evaluate initial board
  useEffect(() => {
    evaluatePosition(START_FEN, 'w');
  }, [evaluatePosition]);

  // Turn execution
  const executeTurn = useCallback(async (isSingleStep = false) => {
    if (isExecutingRef.current) return;
    const currentChess = chessRef.current;
    const currentMatch = matchRef.current;

    // Check if match was ended or paused
    if (currentMatch.status === 'finished') return;
    if (!isSingleStep && matchStatusRef.current !== 'running') return;

    // Check end condition before turn
    const endCheck = checkGameEnd(currentChess, currentMatch.moves.length, currentMatch.settings.maxPly);
    if (endCheck.isOver) {
      setMatch((prev) => {
        const finished: Match = {
          ...prev,
          status: 'finished',
          result: endCheck.result,
          terminationReason: endCheck.reasonKey,
        };
        saveMatch(finished);
        return finished;
      });
      return;
    }

    isExecutingRef.current = true;
    setIsThinking(true);
    setLiveReasoning('');
    setCurrentAttempts([]);

    const activeColor: PlayerColor = currentChess.turn() as PlayerColor;
    const activePlayer = activeColor === 'w' ? currentMatch.white : currentMatch.black;
    const legalMoves = getLegalMoves(currentChess);
    const fenBefore = currentChess.fen();
    const pgnBefore = currentChess.pgn();
    const moveNumber = Math.floor(currentMatch.moves.length / 2) + 1;

    let chosenSan: string | null = null;
    let chosenMoveObj: Move | null = null;
    let isForfeit = false;
    let finalReasoning = '';
    let finalReasoningType: 'reasoning' | 'explanation' = 'explanation';
    let totalLatencyMs = 0;
    const attemptsCollected: MoveAttempt[] = [];

    let attemptNumber = 1;
    let previousError: string | undefined = undefined;

    while (attemptNumber <= 3 && !chosenSan) {
      if (matchStatusRef.current === 'paused' && !isSingleStep) {
        // Paused by user during thinking
        break;
      }

      try {
        const res = await fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fen: fenBefore,
            pgn: pgnBefore,
            color: activeColor,
            legalMoves,
            player: activePlayer,
            attemptNumber,
            previousError,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        // Read SSE stream
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedReasoning = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'chunk') {
                streamedReasoning += data.text;
                setLiveReasoning((prev) => prev + data.text);
              } else if (data.type === 'done') {
                finalReasoning = data.reasoning || streamedReasoning;
                finalReasoningType = data.reasoningType || 'explanation';
                setLiveReasoningType(finalReasoningType);
                totalLatencyMs += data.latencyMs || 0;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              if (msg && msg !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }

        // Validate parsed move
        const parsed = parseModelMove(finalReasoning || streamedReasoning);
        if (!parsed.san) {
          const attemptError = parsed.error || 'Move syntax invalid';
          attemptsCollected.push({ raw: streamedReasoning, error: attemptError });
          setCurrentAttempts([...attemptsCollected]);
          previousError = attemptError;
          attemptNumber++;
          continue;
        }

        const validation = validateMove(currentChess, parsed.san);
        if (!validation.valid || !validation.moveObj) {
          const attemptError = validation.error || `Move '${parsed.san}' is illegal`;
          attemptsCollected.push({ raw: streamedReasoning, error: attemptError, san: parsed.san });
          setCurrentAttempts([...attemptsCollected]);
          previousError = attemptError;
          attemptNumber++;
          continue;
        }

        // Successfully found legal move!
        chosenSan = validation.moveObj.san;
        chosenMoveObj = validation.moveObj;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Error occurred while contacting provider';
        console.error('API or Turn execution error:', err);
        setIsThinking(false);
        isExecutingRef.current = false;
        setMatch((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: errMsg,
        }));
        return;
      }
    }

    // If 3 attempts failed, forfeit move fallback
    if (!chosenSan) {
      if (matchStatusRef.current === 'paused' && !isSingleStep) {
        setIsThinking(false);
        isExecutingRef.current = false;
        return;
      }

      const forfeitFallback = getRandomLegalMove(currentChess);
      chosenSan = forfeitFallback.san;
      chosenMoveObj = forfeitFallback.moveObj;
      isForfeit = true;
      if (!finalReasoning) {
        finalReasoning = `Model failed 3 attempts. Fallback legal move selected: ${chosenSan}`;
      }
    }

    if (!chosenMoveObj || !chosenSan) {
      setIsThinking(false);
      isExecutingRef.current = false;
      return;
    }

    // Apply move to chess
    currentChess.move(chosenMoveObj);
    const fenAfter = currentChess.fen();

    const moveRecord: MoveRecord = {
      ply: currentMatch.moves.length + 1,
      moveNumber,
      color: activeColor,
      san: chosenSan,
      from: chosenMoveObj.from,
      to: chosenMoveObj.to,
      fenBefore,
      fenAfter,
      reasoning: finalReasoning,
      reasoningType: finalReasoningType,
      attempts: attemptsCollected,
      latencyMs: totalLatencyMs,
      forfeitRandom: isForfeit,
      evalCp: currentEval.cp,
      evalMate: currentEval.mate,
    };

    // Update Stockfish eval for new position
    evaluatePosition(fenAfter, currentChess.turn() as 'w' | 'b');

    // Check game termination after move
    const afterEndCheck = checkGameEnd(currentChess, currentMatch.moves.length + 1, currentMatch.settings.maxPly);

    setMatch((prev) => {
      const nextMoves = [...prev.moves, moveRecord];
      const isFinished = afterEndCheck.isOver;
      const updated: Match = {
        ...prev,
        status: isFinished ? 'finished' : isSingleStep ? 'paused' : prev.status,
        result: afterEndCheck.result,
        terminationReason: afterEndCheck.reasonKey,
        currentFen: fenAfter,
        activeColor: currentChess.turn() as PlayerColor,
        moves: nextMoves,
      };

      if (isFinished) {
        saveMatch(updated);
      }
      return updated;
    });

    setIsThinking(false);
    isExecutingRef.current = false;

    // Continue loop if running and not ended
    if (!afterEndCheck.isOver && matchStatusRef.current === 'running' && !isSingleStep) {
      setTimeout(() => {
        if (matchStatusRef.current === 'running') {
          executeTurnRef.current(false);
        }
      }, currentMatch.settings.moveDelayMs);
    }
  }, [evaluatePosition, currentEval]);

  useEffect(() => {
    executeTurnRef.current = executeTurn;
  }, [executeTurn]);

  const startMatch = useCallback(() => {
    setPreviewPly(null);
    setMatch((prev) => ({
      ...prev,
      status: 'running',
      errorMessage: undefined,
    }));
    matchStatusRef.current = 'running';

    setTimeout(() => {
      executeTurnRef.current(false);
    }, 100);
  }, []);

  const pauseMatch = useCallback(() => {
    setMatch((prev) => ({
      ...prev,
      status: 'paused',
    }));
    matchStatusRef.current = 'paused';
  }, []);

  const stepMove = useCallback(() => {
    setPreviewPly(null);
    executeTurnRef.current(true);
  }, []);

  const resetMatch = useCallback(() => {
    matchStatusRef.current = 'idle';
    chessRef.current = createChessInstance();
    setIsThinking(false);
    setLiveReasoning('');
    setCurrentAttempts([]);
    setPreviewPly(null);

    setMatch((prev) => ({
      id: `match_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'idle',
      white: prev.white,
      black: prev.black,
      settings: prev.settings,
      moves: [],
      currentFen: START_FEN,
      activeColor: 'w',
      result: undefined,
      terminationReason: undefined,
      errorMessage: undefined,
    }));

    evaluatePosition(START_FEN, 'w');
  }, [evaluatePosition]);

  const retryCurrentTurn = useCallback(() => {
    setMatch((prev) => ({
      ...prev,
      status: 'running',
      errorMessage: undefined,
    }));
    matchStatusRef.current = 'running';
    executeTurnRef.current(false);
  }, []);

  const setMoveDelay = useCallback((delayMs: number) => {
    setMatch((prev) => ({
      ...prev,
      settings: { ...prev.settings, moveDelayMs: delayMs },
    }));
  }, []);

  const setMaxPly = useCallback((maxPly: number) => {
    setMatch((prev) => ({
      ...prev,
      settings: { ...prev.settings, maxPly },
    }));
  }, []);

  const setWhitePlayer = useCallback((config: PlayerConfig) => {
    setMatch((prev) => ({ ...prev, white: config }));
  }, []);

  const setBlackPlayer = useCallback((config: PlayerConfig) => {
    setMatch((prev) => ({ ...prev, black: config }));
  }, []);

  const flipBoard = useCallback(() => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  const selectHistoryPly = useCallback((ply: number | null) => {
    setPreviewPly(ply);
  }, []);

  // Compute displayed FEN and last move squares
  const displayedFen = previewPly !== null && match.moves[previewPly - 1]
    ? match.moves[previewPly - 1].fenAfter
    : match.currentFen;

  const displayedMove = previewPly !== null && match.moves[previewPly - 1]
    ? match.moves[previewPly - 1]
    : match.moves[match.moves.length - 1];

  const lastMoveSquares = displayedMove
    ? [displayedMove.from, displayedMove.to]
    : [];

  const captured = useMemo(() => {
    return getCapturedPieces(new Chess(displayedFen));
  }, [displayedFen]);

  const getPgnString = useCallback(() => {
    return exportPgnWithComments(match);
  }, [match]);

  return {
    match,
    displayedFen,
    displayedMove,
    lastMoveSquares,
    liveReasoning,
    liveReasoningType,
    isThinking,
    currentAttempts,
    boardOrientation,
    previewPly,
    captured,
    currentEval,
    startMatch,
    pauseMatch,
    stepMove,
    resetMatch,
    retryCurrentTurn,
    setMoveDelay,
    setMaxPly,
    setWhitePlayer,
    setBlackPlayer,
    flipBoard,
    selectHistoryPly,
    getPgnString,
  };
}
