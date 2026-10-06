import { Chess, Move } from 'chess.js';
import { MoveRecord, PlayerColor, PieceCode } from './types';
import { parseModelMoveStrict, validateMoveWithRules } from './rule-validator';

export interface GameEndInfo {
  isOver: boolean;
  result?: string; // '1-0' | '0-1' | '1/2-1/2'
  reasonKey?: string;
  drawReason?: string;
  winnerColor?: PlayerColor;
  explanationEn?: string;
  explanationId?: string;
}

export function createChessInstance(fen?: string): Chess {
  return new Chess(fen);
}

export function getLegalMoves(game: Chess): string[] {
  return game.moves();
}

export function parseModelMove(rawOutput: string): { san: string | null; error?: string } {
  const result = parseModelMoveStrict(rawOutput);
  return { san: result.san, error: result.error };
}

export function validateMove(game: Chess, sanCandidate: string): { valid: boolean; moveObj?: Move; error?: string } {
  const result = validateMoveWithRules(game, sanCandidate);
  return { valid: result.valid, moveObj: result.moveObj, error: result.ruleExplanation };
}

export function getRandomLegalMove(game: Chess): { san: string; moveObj: Move } {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }
  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  const selected = legalMoves[randomIndex];
  return { san: selected.san, moveObj: selected };
}

export function getGameEndExplanation(reasonKey?: string, winnerColor?: PlayerColor, locale: 'id' | 'en' = 'en'): string {
  if (!reasonKey) return '';
  const isId = locale === 'id';
  const winnerEn = winnerColor === 'w' ? 'White' : winnerColor === 'b' ? 'Black' : '';
  const winnerId = winnerColor === 'w' ? 'Putih' : winnerColor === 'b' ? 'Hitam' : '';

  switch (reasonKey) {
    case 'resultCheckmate':
      return isId
        ? `Skakmat: ${winnerId} menang. Raja sedang diskak tanpa ada langkah legal untuk keluar.`
        : `Checkmate: ${winnerEn} won. The king is in check with no legal way out.`;
    case 'resultStalemate':
      return isId
        ? 'Remis karena pat (stalemate): pihak yang giliran melangkah tidak memiliki langkah legal dan tidak sedang diskak.'
        : 'Draw by stalemate: the side to move has no legal move and is not in check.';
    case 'resultThreefold':
      return isId
        ? 'Remis karena pengulangan tiga kali (threefold repetition): posisi papan yang persis sama telah terjadi tiga kali.'
        : 'Draw by threefold repetition: the exact board position has occurred three times.';
    case 'resultInsufficient':
      return isId
        ? 'Remis karena materi tidak cukup: kedua pihak tidak memiliki bidak yang tersisa untuk memaksakan skakmat.'
        : 'Draw by insufficient material: neither side has enough pieces remaining to force a checkmate.';
    case 'resultFiftyMove':
      return isId
        ? 'Remis karena aturan 50 langkah: 50 langkah beruntun dimainkan tanpa langkah pion atau memakan bidak.'
        : 'Draw by fifty-move rule: 50 consecutive moves were played without a pawn move or capture.';
    case 'resultMoveLimit':
      return isId
        ? 'Remis karena batas langkah: pertandingan telah mencapai batas langkah maksimum yang ditentukan.'
        : 'Draw by move limit: the match reached the configured maximum move limit.';
    default:
      return '';
  }
}

export function checkGameEnd(game: Chess, plyCount: number, maxPly: number): GameEndInfo {
  if (game.isCheckmate()) {
    const winnerColor: PlayerColor = game.turn() === 'w' ? 'b' : 'w';
    const winnerEn = winnerColor === 'w' ? 'White' : 'Black';
    const winnerId = winnerColor === 'w' ? 'Putih' : 'Hitam';
    return {
      isOver: true,
      result: winnerColor === 'w' ? '1-0' : '0-1',
      reasonKey: 'resultCheckmate',
      winnerColor,
      explanationEn: `Checkmate: ${winnerEn} won. The king is in check with no legal way out.`,
      explanationId: `Skakmat: ${winnerId} menang. Raja sedang diskak tanpa ada langkah legal untuk keluar.`,
    };
  }

  if (game.isStalemate()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultStalemate',
      drawReason: 'Stalemate',
      explanationEn: 'Draw by stalemate: the side to move has no legal move and is not in check.',
      explanationId: 'Remis karena pat (stalemate): pihak yang giliran melangkah tidak memiliki langkah legal dan tidak sedang diskak.',
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultThreefold',
      drawReason: 'Threefold Repetition',
      explanationEn: 'Draw by threefold repetition: the exact board position has occurred three times.',
      explanationId: 'Remis karena pengulangan tiga kali (threefold repetition): posisi papan yang persis sama telah terjadi tiga kali.',
    };
  }

  if (game.isInsufficientMaterial()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultInsufficient',
      drawReason: 'Insufficient Material',
      explanationEn: 'Draw by insufficient material: neither side has enough pieces remaining to force a checkmate.',
      explanationId: 'Remis karena materi tidak cukup: kedua pihak tidak memiliki bidak yang tersisa untuk memaksakan skakmat.',
    };
  }

  if (game.isDraw()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultFiftyMove',
      drawReason: '50-Move Rule (Endless Loop Prevention)',
      explanationEn: 'Draw by fifty-move rule: 50 consecutive moves were played without a pawn move or capture.',
      explanationId: 'Remis karena aturan 50 langkah: 50 langkah beruntun dimainkan tanpa langkah pion atau memakan bidak.',
    };
  }

  if (plyCount >= maxPly) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultMoveLimit',
      drawReason: 'Move Limit Reached',
      explanationEn: 'Draw by move limit: the match reached the configured maximum move limit.',
      explanationId: 'Remis karena batas langkah: pertandingan telah mencapai batas langkah maksimum yang ditentukan.',
    };
  }

  return { isOver: false };
}

export function getCapturedPieces(game: Chess): { capturedByWhite: PieceCode[]; capturedByBlack: PieceCode[] } {
  const initialCounts = {
    w: { P: 8, N: 2, B: 2, R: 2, Q: 1 },
    b: { P: 8, N: 2, B: 2, R: 2, Q: 1 },
  };

  const currentCounts = {
    w: { P: 0, N: 0, B: 0, R: 0, Q: 0 },
    b: { P: 0, N: 0, B: 0, R: 0, Q: 0 },
  };

  const board = game.board();
  for (const row of board) {
    for (const square of row) {
      if (square && square.type !== 'k') {
        const color = square.color as 'w' | 'b';
        const type = square.type.toUpperCase() as 'P' | 'N' | 'B' | 'R' | 'Q';
        currentCounts[color][type]++;
      }
    }
  }

  const capturedByWhite: PieceCode[] = [];
  const capturedByBlack: PieceCode[] = [];

  // Pieces captured by White are missing Black pieces
  for (const type of ['Q', 'R', 'B', 'N', 'P'] as const) {
    const missing = initialCounts.b[type] - currentCounts.b[type];
    for (let i = 0; i < missing; i++) {
      capturedByWhite.push(`b${type}` as PieceCode);
    }
  }

  // Pieces captured by Black are missing White pieces
  for (const type of ['Q', 'R', 'B', 'N', 'P'] as const) {
    const missing = initialCounts.w[type] - currentCounts.w[type];
    for (let i = 0; i < missing; i++) {
      capturedByBlack.push(`w${type}` as PieceCode);
    }
  }

  return { capturedByWhite, capturedByBlack };
}

export function exportPgnWithComments(
  match: {
    white: { displayName: string };
    black: { displayName: string };
    result?: string;
    moves: MoveRecord[];
    createdAt: string;
  }
): string {
  const headers = [
    `[Event "AI Chess Arena Match"]`,
    `[Site "AI Chess Arena"]`,
    `[Date "${match.createdAt.slice(0, 10).replace(/-/g, '.')}"]`,
    `[Round "1"]`,
    `[White "${match.white.displayName}"]`,
    `[Black "${match.black.displayName}"]`,
    `[Result "${match.result || '*'}"]`,
  ];

  let pgnText = headers.join('\n') + '\n\n';

  for (let i = 0; i < match.moves.length; i++) {
    const m = match.moves[i];
    if (m.color === 'w') {
      pgnText += `${m.moveNumber}. `;
    }
    pgnText += `${m.san} `;

    // Clean comment text (escape braces)
    const cleanReasoning = m.reasoning.replace(/[{}]/g, '').trim().replace(/\n+/g, ' ');
    const tag = m.forfeitRandom ? '[FORFEIT MOVE] ' : '';
    const latency = `[${m.latencyMs}ms]`;
    pgnText += `{ ${tag}${latency} ${cleanReasoning} } `;

    if (m.color === 'b' || i === match.moves.length - 1) {
      pgnText += '\n';
    }
  }

  if (match.result) {
    pgnText += ` ${match.result}`;
  }

  return pgnText.trim();
}
