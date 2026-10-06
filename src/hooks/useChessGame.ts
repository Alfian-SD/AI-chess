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
  checkGameEnd,
  getRandomLegalMove,
  getCapturedPieces,
  exportPgnWithComments,
} from '../lib/chess-engine';
import { findKingSquare } from '../lib/position-analysis';
import { getRandomOpening, OpeningLine } from '../lib/openings';
import { saveMatch } from '../lib/storage';
import { streamModelTurn } from '../lib/llm-client';
import {
  loadSavedSettings,
  saveSettings,
  isPlayerConfigured,
  MOCK_WHITE_PLAYER,
  MOCK_BLACK_PLAYER,
} from '../lib/settings';
import { useStockfish } from './useStockfish';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function generateGameId(): string {
  return `game_${Math.random().toString(36).substring(2, 8)}_${Date.now().toString(36)}`;
}

function getPositionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

const DEFAULT_SETTINGS: MatchSettings = {
  moveDelayMs: 1000,
  maxPly: 200,
  randomOpening: true,
  mockEnabled: false,
};

export function useChessGame() {
  const chessRef = useRef<Chess>(createChessInstance());
  const { evaluatePosition, currentEval } = useStockfish();

  // Active opening book reference
  const activeOpeningRef = useRef<OpeningLine | null>(null);

  const [match, setMatch] = useState<Match>(() => {
    const initialGameId = generateGameId();
    const opening = getRandomOpening();
    activeOpeningRef.current = opening;

    const saved = loadSavedSettings();
    const isMock = saved.mockEnabled;

    const whiteConfig: PlayerConfig = isMock
      ? { ...MOCK_WHITE_PLAYER }
      : { ...saved.white };

    const blackConfig: PlayerConfig = isMock
      ? { ...MOCK_BLACK_PLAYER }
      : { ...saved.black };

    return {
      id: `match_${Date.now()}`,
      gameId: initialGameId,
      createdAt: new Date().toISOString(),
      status: 'idle',
      white: whiteConfig,
      black: blackConfig,
      settings: {
        ...DEFAULT_SETTINGS,
        mockEnabled: saved.mockEnabled,
      },
      moves: [],
      currentFen: START_FEN,
      activeColor: 'w',
      openingName: opening.name,
    };
  });

  const [liveReasoning, setLiveReasoning] = useState<string>('');
  const [liveReasoningType, setLiveReasoningType] = useState<'reasoning' | 'explanation'>('explanation');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentAttempts, setCurrentAttempts] = useState<MoveAttempt[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [previewPly, setPreviewPly] = useState<number | null>(null);

  // Status and execution refs to avoid stale closure state
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
          drawReason: endCheck.drawReason,
          endExplanation: endCheck.explanationEn,
          inCheck: currentChess.inCheck(),
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
    const currentPly = currentMatch.moves.length;

    let chosenSan: string | null = null;
    let chosenMoveObj: Move | null = null;
    let finalReasoning = '';
    let finalReasoningType: 'reasoning' | 'explanation' = 'explanation';
    let totalLatencyMs = 0;
    let responseSource: 'LIVE' | 'MOCK' | 'FALLBACK' = activePlayer.provider === 'mock' ? 'MOCK' : 'LIVE';
    let isBookMove = false;
    const attemptsCollected: MoveAttempt[] = [];

    // 1. Check opening repertoire for the first plies
    if (
      currentMatch.settings.randomOpening !== false &&
      activeOpeningRef.current &&
      currentPly < activeOpeningRef.current.moves.length
    ) {
      const candidateBookMove = activeOpeningRef.current.moves[currentPly];
      const bookValidation = validateMove(currentChess, candidateBookMove);
      if (bookValidation.valid && bookValidation.moveObj) {
        chosenSan = bookValidation.moveObj.san;
        chosenMoveObj = bookValidation.moveObj;
        isBookMove = true;
        finalReasoning = `Opening Repertoire [${activeOpeningRef.current.name}]: Executing theoretical line ${chosenSan}. (${activeOpeningRef.current.description})`;
        finalReasoningType = 'explanation';
        setLiveReasoning(finalReasoning);
        setLiveReasoningType('explanation');
        totalLatencyMs = 15;
        responseSource = 'LIVE';
      }
    }

    // 2. Query the AI model directly from the browser
    if (!chosenSan) {
      const currentPosKey = getPositionKey(fenBefore);
      let positionCount = 0;
      if (getPositionKey(START_FEN) === currentPosKey) positionCount++;
      for (const m of currentMatch.moves) {
        if (getPositionKey(m.fenAfter) === currentPosKey) {
          positionCount++;
        }
      }
      const isRepeatedPosition = positionCount >= 2;

      let attemptNumber = 1;
      let previousError: string | undefined = undefined;

      while (attemptNumber <= 3 && !chosenSan) {
        if (matchStatusRef.current === 'paused' && !isSingleStep) {
          break;
        }

        try {
          setLiveReasoning('');
          const turnResult = await streamModelTurn(
            {
              fen: fenBefore,
              pgn: pgnBefore,
              color: activeColor,
              legalMoves,
              player: activePlayer,
              attemptNumber,
              previousError,
              gameId: currentMatch.gameId,
              moveNumber,
              isRepeatedPosition,
              game: currentChess,
              previousPositions: currentMatch.moves.map((m) => m.fenAfter),
            },
            (chunk) => {
              setLiveReasoning((prev) => prev + chunk);
            }
          );

          finalReasoning = turnResult.reasoning;
          finalReasoningType = turnResult.reasoningType;
          totalLatencyMs += turnResult.latencyMs;
          responseSource = turnResult.source;

          // Parse and validate move
          const parsed = parseModelMove(turnResult.fullOutput || finalReasoning);
          if (!parsed.san) {
            const attemptError = parsed.error || 'Move syntax invalid (must end with MOVE: <san>)';
            attemptsCollected.push({ raw: turnResult.fullOutput, error: attemptError });
            setCurrentAttempts([...attemptsCollected]);
            previousError = attemptError;
            attemptNumber++;
            continue;
          }

          const validation = validateMove(currentChess, parsed.san);
          if (!validation.valid || !validation.moveObj) {
            const attemptError = validation.error || `Move '${parsed.san}' is illegal`;
            attemptsCollected.push({ raw: turnResult.fullOutput, error: attemptError, san: parsed.san });
            setCurrentAttempts([...attemptsCollected]);
            previousError = attemptError;
            attemptNumber++;
            continue;
          }

          // Valid move found
          chosenSan = validation.moveObj.san;
          chosenMoveObj = validation.moveObj;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Error communicating with model provider';
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
    }

    let isForfeitMove = false;

    // After 3 failed attempts, play a random legal move and tag it FORFEIT MOVE
    if (!chosenSan || !chosenMoveObj) {
      if (attemptsCollected.length >= 3) {
        const forfeit = getRandomLegalMove(currentChess);
        chosenSan = forfeit.san;
        chosenMoveObj = forfeit.moveObj;
        finalReasoning = `[FORFEIT MOVE]: ${activePlayer.displayName || activeColor} failed 3 consecutive attempts to provide a legal move. The arbiter played a random legal move (${chosenSan}).`;
        finalReasoningType = 'explanation';
        isForfeitMove = true;
      } else {
        setIsThinking(false);
        isExecutingRef.current = false;
        if (matchStatusRef.current !== 'paused') {
          setMatch((prev) => ({
            ...prev,
            status: 'error',
            errorMessage:
              'AI provider failed to generate a valid legal move. Game paused. Click Retry to re-evaluate.',
          }));
        }
        return;
      }
    }

    // Apply move to chess instance
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
      forfeitRandom: isForfeitMove,
      evalCp: currentEval.cp,
      evalMate: currentEval.mate,
      source: isBookMove ? 'LIVE' : responseSource,
      provider: activePlayer.provider,
      model: activePlayer.model,
      temperature: activePlayer.temperature ?? 0.7,
      gameId: currentMatch.gameId,
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
        drawReason: afterEndCheck.drawReason,
        endExplanation: afterEndCheck.explanationEn,
        inCheck: currentChess.inCheck(),
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

  // Check if players are configured to play
  const isConfigured = useMemo(() => {
    const isMock = match.settings.mockEnabled;
    return isPlayerConfigured(match.white, isMock) && isPlayerConfigured(match.black, isMock);
  }, [match.white, match.black, match.settings.mockEnabled]);

  const startMatch = useCallback(() => {
    if (!isConfigured) {
      // Return false to signal caller to show settings/welcome modal
      return false;
    }
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
    return true;
  }, [isConfigured]);

  const pauseMatch = useCallback(() => {
    setMatch((prev) => ({
      ...prev,
      status: 'paused',
    }));
    matchStatusRef.current = 'paused';
  }, []);

  const stepMove = useCallback(() => {
    if (!isConfigured) return false;
    setPreviewPly(null);
    executeTurnRef.current(true);
    return true;
  }, [isConfigured]);

  const resetMatch = useCallback(() => {
    matchStatusRef.current = 'idle';
    chessRef.current = createChessInstance();
    setIsThinking(false);
    setLiveReasoning('');
    setCurrentAttempts([]);
    setPreviewPly(null);

    const newGameId = generateGameId();
    const opening =
      matchRef.current.settings.randomOpening !== false
        ? getRandomOpening(matchRef.current.settings.reproducibleSeed)
        : null;
    activeOpeningRef.current = opening;

    setMatch((prev) => ({
      id: `match_${Date.now()}`,
      gameId: newGameId,
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
      drawReason: undefined,
      openingName: opening ? opening.name : undefined,
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

  const setRandomOpening = useCallback((enabled: boolean) => {
    setMatch((prev) => {
      const updated = {
        ...prev,
        settings: { ...prev.settings, randomOpening: enabled },
      };
      if (!enabled) {
        activeOpeningRef.current = null;
        updated.openingName = undefined;
      } else if (!activeOpeningRef.current && prev.moves.length === 0) {
        const op = getRandomOpening(prev.settings.reproducibleSeed);
        activeOpeningRef.current = op;
        updated.openingName = op.name;
      }
      return updated;
    });
  }, []);

  const setWhitePlayer = useCallback((config: PlayerConfig) => {
    setMatch((prev) => ({ ...prev, white: config }));
  }, []);

  const setBlackPlayer = useCallback((config: PlayerConfig) => {
    setMatch((prev) => ({ ...prev, black: config }));
  }, []);

  const setMockEnabled = useCallback((enabled: boolean) => {
    setMatch((prev) => {
      const whiteConfig = enabled ? { ...MOCK_WHITE_PLAYER } : { ...prev.white };
      const blackConfig = enabled ? { ...MOCK_BLACK_PLAYER } : { ...prev.black };
      return {
        ...prev,
        white: whiteConfig,
        black: blackConfig,
        settings: { ...prev.settings, mockEnabled: enabled },
      };
    });
  }, []);

  const flipBoard = useCallback(() => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  const selectHistoryPly = useCallback((ply: number | null) => {
    setPreviewPly(ply);
  }, []);

  // Compute displayed FEN and last move squares
  const displayedFen =
    previewPly !== null && match.moves[previewPly - 1]
      ? match.moves[previewPly - 1].fenAfter
      : match.currentFen;

  const displayedMove =
    previewPly !== null && match.moves[previewPly - 1]
      ? match.moves[previewPly - 1]
      : match.moves[match.moves.length - 1];

  const lastMoveSquares = displayedMove ? [displayedMove.from, displayedMove.to] : [];

  const captured = useMemo(() => {
    return getCapturedPieces(new Chess(displayedFen));
  }, [displayedFen]);

  const isDisplayedInCheck = useMemo(() => {
    return new Chess(displayedFen).inCheck();
  }, [displayedFen]);

  const checkKingSquare = useMemo(() => {
    const c = new Chess(displayedFen);
    return c.inCheck() ? findKingSquare(c, c.turn() as 'w' | 'b') : null;
  }, [displayedFen]);

  const getPgnString = useCallback(() => {
    return exportPgnWithComments(match);
  }, [match]);

  return {
    match,
    displayedFen,
    displayedMove,
    lastMoveSquares,
    isDisplayedInCheck,
    checkKingSquare,
    liveReasoning,
    liveReasoningType,
    isThinking,
    currentAttempts,
    boardOrientation,
    previewPly,
    captured,
    currentEval,
    isConfigured,
    startMatch,
    pauseMatch,
    stepMove,
    resetMatch,
    retryCurrentTurn,
    setMoveDelay,
    setMaxPly,
    setRandomOpening,
    setWhitePlayer,
    setBlackPlayer,
    setMockEnabled,
    flipBoard,
    selectHistoryPly,
    getPgnString,
  };
}
