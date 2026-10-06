import { Chess, Square } from 'chess.js';
import { CHESS_RULES } from './chessRules';

export interface AttackedPieceInfo {
  square: Square;
  pieceType: string;
  color: 'w' | 'b';
  description: string;
  attackers: Square[];
  defenders: Square[];
  isHanging: boolean;
}

export interface PositionFacts {
  sideToMove: 'White' | 'Black';
  colorCode: 'w' | 'b';
  moveNumber: number;
  fen: string;
  asciiBoard: string;
  legalMovesSan: string[];
  inCheck: boolean;
  checkAttackingPieces: string[];
  checkMessage: string;
  castling: {
    whiteRights: { kingside: boolean; queenside: boolean };
    blackRights: { kingside: boolean; queenside: boolean };
    legalCastlingMoves: string[];
    summary: string;
  };
  enPassant: {
    targetSquare: string | null;
    isLegal: boolean;
    legalSan: string | null;
    summary: string;
  };
  promotion: {
    available: boolean;
    moves: string[];
    summary: string;
  };
  drawWarnings: {
    repetitionCount: number;
    halfmoveClock: number;
    insufficientMaterial: boolean;
    summary: string;
  };
  tactics: {
    whiteAttacked: AttackedPieceInfo[];
    whiteHanging: AttackedPieceInfo[];
    blackAttacked: AttackedPieceInfo[];
    blackHanging: AttackedPieceInfo[];
    summary: string;
  };
}

const PIECE_FULL_NAMES: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

/**
 * Finds the king square of the given color on the current board.
 */
export function findKingSquare(game: Chess, color: 'w' | 'b'): Square | null {
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square as Square;
      }
    }
  }
  return null;
}

/**
 * Formats a descriptive label for a piece at a square.
 * e.g. "White Bishop on c4 (c4)"
 */
export function describePiece(type: string, color: 'w' | 'b', square: string): string {
  const colorName = color === 'w' ? 'White' : 'Black';
  const pieceName = PIECE_FULL_NAMES[type.toLowerCase()] || type;
  return `${colorName} ${pieceName} on ${square} (${square})`;
}

/**
 * Computes live facts about the position using chess.js.
 * Never requires the model to calculate these facts independently.
 */
export function computePositionFacts(game: Chess, previousPositions: string[] = []): PositionFacts {
  const fen = game.fen();
  const fenParts = fen.split(' ');
  const colorCode = game.turn() as 'w' | 'b';
  const sideToMove = colorCode === 'w' ? 'White' : 'Black';
  const opponentColor = colorCode === 'w' ? 'b' : 'w';
  const opponentName = opponentColor === 'w' ? 'White' : 'Black';

  // Move number from FEN (6th field) or fallback to 1
  const moveNumber = parseInt(fenParts[5] || '1', 10);
  const legalMovesVerbose = game.moves({ verbose: true });
  const legalMovesSan = game.moves();
  const asciiBoard = game.ascii();

  // 1. Check status & attacking pieces
  const inCheck = game.inCheck();
  const checkAttackingPieces: string[] = [];
  let checkMessage = 'You are not in check.';

  if (inCheck) {
    const kingSquare = findKingSquare(game, colorCode);
    if (kingSquare) {
      const attackerSquares = game.attackers(kingSquare, opponentColor);
      for (const atkSq of attackerSquares) {
        const piece = game.get(atkSq as Square);
        if (piece) {
          checkAttackingPieces.push(describePiece(piece.type, piece.color as 'w' | 'b', atkSq));
        } else {
          checkAttackingPieces.push(`${opponentName} piece on ${atkSq}`);
        }
      }
    }

    const attackersListStr = checkAttackingPieces.length > 0
      ? checkAttackingPieces.join(', ')
      : `${opponentName} piece`;

    checkMessage = `You are in CHECK by: ${attackersListStr}.\nYour move must resolve the check. Legal responses are exactly the legal moves listed.`;
  }

  // 2. Castling rights & current legality
  const whiteRights = game.getCastlingRights('w');
  const blackRights = game.getCastlingRights('b');
  const legalCastlingMoves: string[] = [];

  for (const m of legalMovesVerbose) {
    if (m.san === 'O-O' && !legalCastlingMoves.includes('O-O')) {
      legalCastlingMoves.push('O-O');
    } else if (m.san === 'O-O-O' && !legalCastlingMoves.includes('O-O-O')) {
      legalCastlingMoves.push('O-O-O');
    }
  }

  const castlingSummary = [
    `White castling rights: Kingside (O-O): ${whiteRights.k ? 'Available' : 'Lost'}, Queenside (O-O-O): ${whiteRights.q ? 'Available' : 'Lost'}.`,
    `Black castling rights: Kingside (O-O): ${blackRights.k ? 'Available' : 'Lost'}, Queenside (O-O-O): ${blackRights.q ? 'Available' : 'Lost'}.`,
    legalCastlingMoves.length > 0
      ? `Currently legal castling moves for ${sideToMove}: ${legalCastlingMoves.join(' and ')}.`
      : `Currently legal castling moves for ${sideToMove}: None (blocked, moved, or attacked).`,
  ].join(' ');

  // 3. En passant
  const epTargetFromFen = fenParts[3] !== '-' ? fenParts[3] : null;
  const epMove = legalMovesVerbose.find((m) => m.flags && m.flags.includes('e'));
  const epIsLegal = Boolean(epMove);
  const epLegalSan = epMove ? epMove.san : null;

  let epSummary: string;
  if (epIsLegal && epLegalSan) {
    epSummary = `En passant target square: ${epTargetFromFen}. Legal capture available this turn: YES (${epLegalSan}).`;
  } else if (epTargetFromFen) {
    epSummary = `En passant target square from previous 2-square pawn push: ${epTargetFromFen}. (No pawn can legally capture it on this turn).`;
  } else {
    epSummary = 'En passant target square: None (-). No en passant capture available.';
  }

  // 4. Promotion moves
  const promotionMoves = Array.from(
    new Set(legalMovesVerbose.filter((m) => Boolean(m.promotion)).map((m) => m.san))
  );
  const promotionAvailable = promotionMoves.length > 0;
  const promotionSummary = promotionAvailable
    ? `Pawn promotion is available this turn: ${promotionMoves.join(', ')}. Choose your promotion piece deliberately (Queen, Rook, Bishop, or Knight) based on positional needs—do not automatically default to Queen if another piece offers tactical advantage or avoids stalemate.`
    : 'Pawn promotion: None available on this turn.';

  // 5. Draw warnings
  // Count current position key occurrences
  const currentPosKey = fen.split(' ').slice(0, 4).join(' ');
  let repetitionCount = 1;
  for (const prev of previousPositions) {
    if (prev.split(' ').slice(0, 4).join(' ') === currentPosKey) {
      repetitionCount++;
    }
  }

  const halfmoveClock = parseInt(fenParts[4] || '0', 10);
  const insufficientMaterial = game.isInsufficientMaterial();

  const drawWarningParts: string[] = [
    `Position repetition count: ${repetitionCount} (threefold repetition triggers a draw).`,
    `Halfmove clock (fifty-move rule): ${halfmoveClock}/100 halfmoves (${Math.max(0, 100 - halfmoveClock)} plies remaining before draw).`,
  ];
  if (repetitionCount >= 2) {
    drawWarningParts.push('WARNING: This position has occurred twice. Repeating it will immediately cause a draw by threefold repetition!');
  }
  if (halfmoveClock >= 80) {
    drawWarningParts.push(`WARNING: Fifty-move rule draw is imminent (${100 - halfmoveClock} halfmoves left without pawn move or capture)!`);
  }
  if (insufficientMaterial) {
    drawWarningParts.push('WARNING: Insufficient material to force checkmate. Position is drawn.');
  }

  // 6. Hanging pieces and pieces under attack for both sides
  const whiteAttacked: AttackedPieceInfo[] = [];
  const whiteHanging: AttackedPieceInfo[] = [];
  const blackAttacked: AttackedPieceInfo[] = [];
  const blackHanging: AttackedPieceInfo[] = [];

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let r = 1; r <= 8; r++) {
    for (const f of files) {
      const sq = `${f}${r}` as Square;
      const piece = game.get(sq);
      if (!piece) continue;

      const pColor = piece.color as 'w' | 'b';
      const enemyColor = pColor === 'w' ? 'b' : 'w';
      const attackers = game.attackers(sq, enemyColor) as Square[];
      const defenders = game.attackers(sq, pColor) as Square[];

      if (attackers.length > 0) {
        const isHanging = defenders.length === 0;
        const info: AttackedPieceInfo = {
          square: sq,
          pieceType: piece.type,
          color: pColor,
          description: describePiece(piece.type, pColor, sq),
          attackers,
          defenders,
          isHanging,
        };

        if (pColor === 'w') {
          whiteAttacked.push(info);
          if (isHanging) whiteHanging.push(info);
        } else {
          blackAttacked.push(info);
          if (isHanging) blackHanging.push(info);
        }
      }
    }
  }

  const formatTacticsList = (items: AttackedPieceInfo[]): string => {
    if (items.length === 0) return 'None';
    return items.map((i) => `${i.description} [attacked from: ${i.attackers.join(', ')}]`).join('; ');
  };

  const tacticsSummary = [
    `White pieces under attack: ${formatTacticsList(whiteAttacked)}`,
    `White hanging (undefended) pieces: ${formatTacticsList(whiteHanging)}`,
    `Black pieces under attack: ${formatTacticsList(blackAttacked)}`,
    `Black hanging (undefended) pieces: ${formatTacticsList(blackHanging)}`,
  ].join('\n');

  return {
    sideToMove,
    colorCode,
    moveNumber,
    fen,
    asciiBoard,
    legalMovesSan,
    inCheck,
    checkAttackingPieces,
    checkMessage,
    castling: {
      whiteRights: { kingside: Boolean(whiteRights.k), queenside: Boolean(whiteRights.q) },
      blackRights: { kingside: Boolean(blackRights.k), queenside: Boolean(blackRights.q) },
      legalCastlingMoves,
      summary: castlingSummary,
    },
    enPassant: {
      targetSquare: epTargetFromFen,
      isLegal: epIsLegal,
      legalSan: epLegalSan,
      summary: epSummary,
    },
    promotion: {
      available: promotionAvailable,
      moves: promotionMoves,
      summary: promotionSummary,
    },
    drawWarnings: {
      repetitionCount,
      halfmoveClock,
      insufficientMaterial,
      summary: drawWarningParts.join(' '),
    },
    tactics: {
      whiteAttacked,
      whiteHanging,
      blackAttacked,
      blackHanging,
      summary: tacticsSummary,
    },
  };
}

export interface BuildTurnPromptParams {
  game: Chess;
  gameId?: string;
  pgnHistory?: string;
  previousPositions?: string[];
  retryAttempt?: number;
  retryErrorExplanation?: string;
}

/**
 * Builds the complete system prompt for a player, injecting CHESS_RULES (English).
 */
export function buildSystemPromptWithRules(colorName: 'White' | 'Black', gameId = 'arena_game'): string {
  return `You are a Grandmaster chess engine playing as ${colorName}.
[Session: Game ID ${gameId}]

${CHESS_RULES}

RULES ENFORCEMENT & OPERATIONAL PROTOCOL:
1. You MUST evaluate the live position facts provided in every turn (board FEN, ASCII board, check state, castling legality, en passant, promotion options, hanging pieces, and legal moves).
2. Never attempt illegal moves. You MUST select your move exclusively from the provided legal move list in Standard Algebraic Notation (SAN).
3. Provide your tactical evaluation, plan, and candidate reasoning FIRST.
4. On your very final line, output ONLY your chosen move in the exact format:
MOVE: <san>
No trailing punctuation or text after the MOVE: <san> line.`;
}

/**
 * Builds the complete live turn user prompt with all chess.js facts computed.
 */
export function buildTurnUserPrompt(params: BuildTurnPromptParams): string {
  const {
    game,
    gameId = 'arena_game',
    pgnHistory = '',
    previousPositions = [],
    retryAttempt,
    retryErrorExplanation,
  } = params;

  const facts = computePositionFacts(game, previousPositions);

  const promptSections = [
    `[GAME METADATA: Game ID ${gameId}, Turn ${facts.moveNumber}]`,
    `Side to move: ${facts.sideToMove}`,
    `Current board FEN: ${facts.fen}`,
    '',
    `[ASCII BOARD]`,
    facts.asciiBoard,
    '',
    `[CHECK STATUS]`,
    facts.checkMessage,
    '',
    `[CASTLING STATUS]`,
    facts.castling.summary,
    '',
    `[EN PASSANT]`,
    facts.enPassant.summary,
    '',
    `[PROMOTION STATUS]`,
    facts.promotion.summary,
    '',
    `[TACTICAL PIECE SAFETY: ATTACKED & HANGING PIECES]`,
    facts.tactics.summary,
    '',
    `[DRAW WARNINGS]`,
    facts.drawWarnings.summary,
    '',
    `[PGN HISTORY]`,
    pgnHistory ? pgnHistory.trim() : '(Start of game)',
    '',
    `[LEGAL MOVES (${facts.legalMovesSan.length} available)]`,
    facts.legalMovesSan.join(', '),
  ];

  if (retryAttempt && retryAttempt > 1 && retryErrorExplanation) {
    promptSections.push(
      '',
      `[CRITICAL RETRY ATTEMPT ${retryAttempt}/3]`,
      `Your previous move attempt was REJECTED:`,
      `REASON: ${retryErrorExplanation}`,
      `You MUST choose a strictly legal move from the list above.`,
      `Remember to end your response with:`,
      `MOVE: <san>`
    );
  } else {
    promptSections.push(
      '',
      `[ACTION REQUIRED]`,
      `Your turn as ${facts.sideToMove}. Provide your reasoning first, then end with:`,
      `MOVE: <san>`
    );
  }

  return promptSections.join('\n');
}
