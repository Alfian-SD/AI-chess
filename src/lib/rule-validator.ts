import { Chess, Move, Square } from 'chess.js';
import { findKingSquare } from './position-analysis';

export interface ParseResult {
  san: string | null;
  rawCandidate?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  moveObj?: Move;
  san?: string;
  ruleExplanation?: string;
}

/**
 * Extracts candidate move from the model's output text.
 * Strictly checks for the MOVE: <san> line as required by PRD and instructions.
 */
export function parseModelMoveStrict(rawOutput: string): ParseResult {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return { san: null, error: 'Empty output from model.' };
  }

  const lines = rawOutput.split('\n');
  let moveCandidate: string | null = null;

  // Search from the bottom up to honor "the model must end with exactly one line: MOVE: <san>"
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const match = line.match(/^MOVE:\s*([`*~]*)([A-Za-z0-9+#=/-]+)([`*~]*)/i);
    if (match && match[2]) {
      moveCandidate = match[2].trim();
      break;
    }
  }

  // Fallback: search anywhere in output
  if (!moveCandidate) {
    const generalMatch = rawOutput.match(/MOVE:\s*([`*~]*)([A-Za-z0-9+#=/-]+)([`*~]*)/i);
    if (generalMatch && generalMatch[2]) {
      moveCandidate = generalMatch[2].trim();
    }
  }

  if (!moveCandidate) {
    return {
      san: null,
      error: 'Could not find required line format "MOVE: <san>". Ensure your final line is formatted exactly as "MOVE: <san>".',
    };
  }

  // Normalize castling notation variants (0-0 -> O-O, 0-0-0 -> O-O-O)
  if (moveCandidate === '0-0') moveCandidate = 'O-O';
  if (moveCandidate === '0-0-0') moveCandidate = 'O-O-O';
  if (moveCandidate.toUpperCase() === 'O-O-0') moveCandidate = 'O-O-O';

  return { san: moveCandidate, rawCandidate: moveCandidate };
}

/**
 * Normalizes SAN string for flexible comparison against legal moves.
 * Strips check/mate symbols (+, #), normalizes castling (0-0 -> O-O),
 * and standardizes promotion syntax (e8Q -> e8=Q).
 */
export function normalizeSan(san: string): string {
  let s = san.trim();
  // Strip formatting markers
  s = s.replace(/[`*~]/g, '');

  // Castling
  if (s === '0-0') return 'O-O';
  if (s === '0-0-0') return 'O-O-O';
  if (s.toUpperCase() === 'O-O-0') return 'O-O-O';

  // Promotion normalization (e.g. e8Q -> e8=Q, e1=q -> e1=Q)
  s = s.replace(/([a-h][18])=?([qrbnQRBN])/g, (_, sq, piece) => `${sq}=${piece.toUpperCase()}`);

  // Strip check and checkmate symbols for fuzzy matching
  return s.replace(/[+#]+$/, '');
}

/**
 * Validates a candidate move against chess.js legal moves.
 * Accepts SAN with or without check/mate symbols (+, #), with or without promotion equals (=Q),
 * and normalized castling.
 */
export function validateMoveWithRules(game: Chess, rawCandidate: string): ValidationResult {
  const legalMovesVerbose = game.moves({ verbose: true });
  if (legalMovesVerbose.length === 0) {
    return { valid: false, ruleExplanation: 'No legal moves exist in this position.' };
  }

  const cleaned = rawCandidate.trim().replace(/[`*~]/g, '');
  const normalizedCandidate = normalizeSan(cleaned);

  // 1. Direct SAN match
  const directMatch = legalMovesVerbose.find((m) => m.san === cleaned);
  if (directMatch) {
    return { valid: true, moveObj: directMatch, san: directMatch.san };
  }

  // 2. Normalized match (without + or #, or with promotion variants)
  const normalizedMatch = legalMovesVerbose.find((m) => {
    if (normalizeSan(m.san) === normalizedCandidate) return true;
    // Also try without promotion '=' if candidate omitted it
    const mBase = normalizeSan(m.san).replace('=', '');
    const cBase = normalizedCandidate.replace('=', '');
    return mBase === cBase;
  });

  if (normalizedMatch) {
    return { valid: true, moveObj: normalizedMatch, san: normalizedMatch.san };
  }

  // 3. Try chess.js native parser as fallback
  try {
    const temp = new Chess(game.fen());
    const moveObj = temp.move(cleaned);
    if (moveObj) {
      return { valid: true, moveObj, san: moveObj.san };
    }
  } catch {
    // Expected for illegal moves; proceed to diagnosis
  }

  // Move is illegal; diagnose exact rule-aware reason
  const ruleExplanation = diagnoseIllegalMove(game, cleaned);
  return { valid: false, ruleExplanation };
}

/**
 * Diagnoses WHY an attempted move is illegal using chess.js and chess rules.
 */
export function diagnoseIllegalMove(game: Chess, candidate: string): string {
  const turn = game.turn() as 'w' | 'b';
  const opponent = turn === 'w' ? 'b' : 'w';
  const clean = candidate.trim().replace(/[`*~]/g, '');
  const normalized = normalizeSan(clean);

  // --- 1. Castling Checks ---
  if (normalized === 'O-O' || normalized === 'O-O-O') {
    const isKingside = normalized === 'O-O';
    const rights = game.getCastlingRights(turn);

    if (isKingside && !rights.k) {
      return 'Castling is not allowed: the king or kingside rook has already moved.';
    }
    if (!isKingside && !rights.q) {
      return 'Castling is not allowed: the king or queenside rook has already moved.';
    }

    if (game.inCheck()) {
      return 'Castling is not allowed: you cannot castle while your king is in check.';
    }

    // Check intermediate squares and king safety
    if (turn === 'w') {
      if (isKingside) {
        if (game.get('f1') || game.get('g1')) {
          return 'Castling is not allowed: the path between king and rook is blocked.';
        }
        if (game.isAttacked('f1', 'b')) {
          return 'Castling is not allowed: the king would pass through an attacked square (f1).';
        }
        if (game.isAttacked('g1', 'b')) {
          return 'Castling is not allowed: the king would land on an attacked square (g1).';
        }
      } else {
        if (game.get('d1') || game.get('c1') || game.get('b1')) {
          return 'Castling is not allowed: the path between king and rook is blocked.';
        }
        if (game.isAttacked('d1', 'b')) {
          return 'Castling is not allowed: the king would pass through an attacked square (d1).';
        }
        if (game.isAttacked('c1', 'b')) {
          return 'Castling is not allowed: the king would land on an attacked square (c1).';
        }
      }
    } else {
      if (isKingside) {
        if (game.get('f8') || game.get('g8')) {
          return 'Castling is not allowed: the path between king and rook is blocked.';
        }
        if (game.isAttacked('f8', 'w')) {
          return 'Castling is not allowed: the king would pass through an attacked square (f8).';
        }
        if (game.isAttacked('g8', 'w')) {
          return 'Castling is not allowed: the king would land on an attacked square (g8).';
        }
      } else {
        if (game.get('d8') || game.get('c8') || game.get('b8')) {
          return 'Castling is not allowed: the path between king and rook is blocked.';
        }
        if (game.isAttacked('d8', 'w')) {
          return 'Castling is not allowed: the king would pass through an attacked square (d8).';
        }
        if (game.isAttacked('c8', 'w')) {
          return 'Castling is not allowed: the king would land on an attacked square (c8).';
        }
      }
    }

    return 'Castling is not allowed in this position.';
  }

  // --- 2. In Check Status / Pinned Pieces / King Safety ---
  const kingSquare = findKingSquare(game, turn);

  // If currently in check, any unaccepted move failed to resolve check
  if (game.inCheck()) {
    return 'That move leaves your king in check. When in check, you must move the king, block the attack, or capture the attacking piece.';
  }

  // Check if moving a piece exposes the king (pinned piece)
  // Extract destination square: last 2 characters matching [a-h][1-8]
  const destMatch = clean.match(/([a-h][1-8])/g);
  const destSquare = destMatch ? (destMatch[destMatch.length - 1] as Square) : null;

  // Extract piece type from SAN
  const firstChar = clean[0];
  const pieceType = ['N', 'B', 'R', 'Q', 'K'].includes(firstChar) ? firstChar.toLowerCase() : 'p';

  // --- 3. En Passant Checks ---
  const isEnPassantShape =
    pieceType === 'p' &&
    clean.includes('x') &&
    destSquare &&
    ((turn === 'w' && destSquare[1] === '6') || (turn === 'b' && destSquare[1] === '3'));

  if (isEnPassantShape) {
    const epTarget = game.fen().split(' ')[3];
    if (epTarget === '-' || epTarget !== destSquare) {
      return 'En passant is only available on the move right after the 2-square push.';
    }
  }

  // --- 4. Pawn Movement & Capture Rules ---
  if (pieceType === 'p' && destSquare) {
    const isCapture = clean.includes('x');
    const targetPiece = game.get(destSquare);

    if (!isCapture && targetPiece) {
      if (targetPiece.color === opponent) {
        return 'A pawn cannot capture straight ahead. Pawns capture 1 square diagonally forward.';
      } else {
        return 'That square is already occupied by your own piece.';
      }
    }

    if (isCapture && !targetPiece) {
      const epTarget = game.fen().split(' ')[3];
      if (epTarget !== destSquare) {
        return 'A pawn cannot move diagonally unless capturing an enemy piece.';
      }
    }

    // Check pawn direction (cannot move backward)
    const sourceFile = clean.match(/^[a-h]/)?.[0];
    if (sourceFile) {
      const targetRank = parseInt(destSquare[1], 10);
      if (turn === 'w' && targetRank < 3) {
        return 'That piece cannot move like that: pawns can only move forward.';
      }
      if (turn === 'b' && targetRank > 6) {
        return 'That piece cannot move like that: pawns can only move forward.';
      }
    }
  }

  // --- 5. Piece-Specific Movement Rules ---
  if (destSquare) {
    const targetPiece = game.get(destSquare);
    if (targetPiece && targetPiece.color === turn) {
      return 'That square is already occupied by your own piece. You cannot capture your own pieces.';
    }

    // If destination square is attacked and piece is king
    if (pieceType === 'k') {
      if (game.isAttacked(destSquare, opponent)) {
        return 'A king cannot move onto an attacked square.';
      }
      if (kingSquare) {
        const fileDist = Math.abs(kingSquare.charCodeAt(0) - destSquare.charCodeAt(0));
        const rankDist = Math.abs(parseInt(kingSquare[1], 10) - parseInt(destSquare[1], 10));
        if (fileDist > 1 || rankDist > 1) {
          return 'That piece cannot move like that: the king moves only 1 square in any direction.';
        }
      }
    }

    // Find candidate source pieces of this type for the current player
    const sourceSquares: Square[] = [];
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === pieceType && p.color === turn) {
          sourceSquares.push(p.square as Square);
        }
      }
    }

    // Check pinned pieces: does moving this piece expose the king?
    if (kingSquare) {
      for (const sq of sourceSquares) {
        // Test if this piece is on a ray to the king
        const temp = new Chess(game.fen());
        temp.remove(sq);
        if (temp.attackers(kingSquare, opponent).length > 0) {
          // If square is pinned and candidate could be using this piece
          return 'That move leaves your king in check.';
        }
      }
    }

    // Geometry & Obstruction checks
    if (pieceType === 'b') {
      // Bishop moves diagonally
      const anyDiagonal = sourceSquares.some((src) => {
        const df = Math.abs(src.charCodeAt(0) - destSquare.charCodeAt(0));
        const dr = Math.abs(parseInt(src[1], 10) - parseInt(destSquare[1], 10));
        return df === dr && df > 0;
      });
      if (!anyDiagonal) {
        return 'That piece cannot move like that: a bishop moves diagonally.';
      } else {
        return 'The path to that square is blocked: a bishop cannot jump over pieces.';
      }
    }

    if (pieceType === 'r') {
      // Rook moves horizontally or vertically
      const anyStraight = sourceSquares.some((src) => {
        const df = src[0] === destSquare[0];
        const dr = src[1] === destSquare[1];
        return (df || dr) && !(df && dr);
      });
      if (!anyStraight) {
        return 'That piece cannot move like that: a rook moves horizontally or vertically, no jumping.';
      } else {
        return 'The path to that square is blocked: a rook cannot jump over pieces.';
      }
    }

    if (pieceType === 'n') {
      // Knight moves in L-shape
      const anyL = sourceSquares.some((src) => {
        const df = Math.abs(src.charCodeAt(0) - destSquare.charCodeAt(0));
        const dr = Math.abs(parseInt(src[1], 10) - parseInt(destSquare[1], 10));
        return (df === 1 && dr === 2) || (df === 2 && dr === 1);
      });
      if (!anyL) {
        return 'That piece cannot move like that: a knight moves in an "L" shape (2 squares straight, then 1 sideways).';
      }
    }

    if (pieceType === 'q') {
      const anyValidRay = sourceSquares.some((src) => {
        const df = Math.abs(src.charCodeAt(0) - destSquare.charCodeAt(0));
        const dr = Math.abs(parseInt(src[1], 10) - parseInt(destSquare[1], 10));
        return (df === dr && df > 0) || ((src[0] === destSquare[0] || src[1] === destSquare[1]) && !(src[0] === destSquare[0] && src[1] === destSquare[1]));
      });
      if (!anyValidRay) {
        return 'That piece cannot move like that: a queen moves horizontally, vertically, or diagonally.';
      } else {
        return 'The path to that square is blocked: a queen cannot jump over pieces.';
      }
    }
  }

  return `That move '${candidate}' is illegal according to standard chess rules.`;
}
