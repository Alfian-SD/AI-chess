import { Chess, Move } from 'chess.js';
import { MoveRecord, PlayerColor, PieceCode } from './types';

export interface GameEndInfo {
  isOver: boolean;
  result?: string; // '1-0' | '0-1' | '1/2-1/2'
  reasonKey?: string;
  winnerColor?: PlayerColor;
}

export function createChessInstance(fen?: string): Chess {
  return new Chess(fen);
}

export function getLegalMoves(game: Chess): string[] {
  return game.moves();
}

export function parseModelMove(rawOutput: string): { san: string | null; error?: string } {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return { san: null, error: 'Empty output from model' };
  }

  // Look for MOVE: <san> pattern (case-insensitive for 'MOVE:')
  // Matches MOVE: e4, MOVE: Nxe5#, MOVE: **O-O**, MOVE: `Nf3`, etc.
  const lines = rawOutput.split('\n');
  let moveCandidate: string | null = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const match = line.match(/^MOVE:\s*([`*~]*)([A-Za-z0-9+#=\-]+)([`*~]*)/i);
    if (match && match[2]) {
      moveCandidate = match[2].trim();
      break;
    }
  }

  // If no explicit line start, look anywhere in output for 'MOVE: <san>'
  if (!moveCandidate) {
    const generalMatch = rawOutput.match(/MOVE:\s*([`*~]*)([A-Za-z0-9+#=\-]+)([`*~]*)/i);
    if (generalMatch && generalMatch[2]) {
      moveCandidate = generalMatch[2].trim();
    }
  }

  if (!moveCandidate) {
    return { san: null, error: 'Could not find line ending with "MOVE: <san>"' };
  }

  // Normalize castling letters (0-0 -> O-O)
  if (moveCandidate === '0-0') moveCandidate = 'O-O';
  if (moveCandidate === '0-0-0') moveCandidate = 'O-O-0';

  return { san: moveCandidate };
}

export function validateMove(game: Chess, sanCandidate: string): { valid: boolean; moveObj?: Move; error?: string } {
  try {
    // Clone game to avoid mutating state if invalid
    const temp = new Chess(game.fen());
    const moveObj = temp.move(sanCandidate);
    if (moveObj) {
      return { valid: true, moveObj };
    }
    return { valid: false, error: `Move '${sanCandidate}' is illegal in this position` };
  } catch {
    return { valid: false, error: `Illegal or unparseable move: ${sanCandidate}` };
  }
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

export function checkGameEnd(game: Chess, plyCount: number, maxPly: number): GameEndInfo {
  if (game.isCheckmate()) {
    const winnerColor: PlayerColor = game.turn() === 'w' ? 'b' : 'w';
    return {
      isOver: true,
      result: winnerColor === 'w' ? '1-0' : '0-1',
      reasonKey: 'resultCheckmate',
      winnerColor,
    };
  }

  if (game.isStalemate()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultStalemate',
    };
  }

  if (game.isThreefoldRepetition()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultThreefold',
    };
  }

  if (game.isInsufficientMaterial()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultInsufficient',
    };
  }

  if (game.isDraw()) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultFiftyMove',
    };
  }

  if (plyCount >= maxPly) {
    return {
      isOver: true,
      result: '1/2-1/2',
      reasonKey: 'resultMoveLimit',
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
