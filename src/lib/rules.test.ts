import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Chess } from 'chess.js';
import {
  parseModelMoveStrict,
  normalizeSan,
  validateMoveWithRules,
  diagnoseIllegalMove,
} from './rule-validator';
import {
  computePositionFacts,
  buildTurnUserPrompt,
  buildSystemPromptWithRules,
  findKingSquare,
} from './position-analysis';
import { checkGameEnd, getGameEndExplanation } from './chess-engine';
import { CHESS_RULES, CHESS_RULES_ID } from './chessRules';

describe('1. Piece Movement and Board Rules', () => {
  it('Pawn movement: single push, double push, diagonal capture, no straight capture', () => {
    const game = new Chess();
    // Starting position: single push and double push legal
    const singlePush = validateMoveWithRules(game, 'e3');
    assert.strictEqual(singlePush.valid, true);

    const doublePush = validateMoveWithRules(game, 'e4');
    assert.strictEqual(doublePush.valid, true);

    // Diagonal capture setup
    const captureGame = new Chess('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    const diagCapture = validateMoveWithRules(captureGame, 'exd5');
    assert.strictEqual(diagCapture.valid, true);

    // Blocked straight capture (pawns facing each other)
    const blockedGame = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    const straightCapture = validateMoveWithRules(blockedGame, 'e5');
    assert.strictEqual(straightCapture.valid, false);
    assert.ok(straightCapture.ruleExplanation?.includes('pawn cannot capture straight ahead'));
  });

  it('Rook movement: straight moves, blocked paths, no jumping', () => {
    // Open board rook
    const rookGame = new Chess('4k3/8/8/8/3R4/8/8/4K3 w - - 0 1');
    assert.strictEqual(validateMoveWithRules(rookGame, 'Rd8+').valid, true);
    assert.strictEqual(validateMoveWithRules(rookGame, 'Ra4').valid, true);

    // Rook trying to move diagonally
    assert.strictEqual(validateMoveWithRules(rookGame, 'Re5+').valid, false);
    const diagError = diagnoseIllegalMove(rookGame, 'Re5');
    assert.ok(diagError.includes('rook moves horizontally or vertically'));

    // Rook blocked by friendly piece
    const blockedRookGame = new Chess('4k3/8/8/8/3R1P2/8/8/4K3 w - - 0 1');
    const jumpAttempt = validateMoveWithRules(blockedRookGame, 'Rg4');
    assert.strictEqual(jumpAttempt.valid, false);
    assert.ok(jumpAttempt.ruleExplanation?.includes('path to that square is blocked'));
  });

  it('Knight movement: L-shape and jumping over pieces', () => {
    const start = new Chess();
    // Knight jumping over pawns
    assert.strictEqual(validateMoveWithRules(start, 'Nf3').valid, true);
    assert.strictEqual(validateMoveWithRules(start, 'Nc3').valid, true);

    // Knight moving straight or illegally
    const knightGame = new Chess('4k3/8/8/8/3N4/8/8/4K3 w - - 0 1');
    const straightKnight = validateMoveWithRules(knightGame, 'Nd6+');
    assert.strictEqual(straightKnight.valid, false);
    assert.ok(straightKnight.ruleExplanation?.includes('knight moves in an "L" shape'));
  });

  it('Bishop movement: diagonal only and color-bound', () => {
    const bishopGame = new Chess('4k3/8/8/8/3B4/8/8/4K3 w - - 0 1');
    assert.strictEqual(validateMoveWithRules(bishopGame, 'Bc5').valid, true);
    assert.strictEqual(validateMoveWithRules(bishopGame, 'Bg7').valid, true);

    // Non-diagonal move
    const straightBishop = validateMoveWithRules(bishopGame, 'Bd5');
    assert.strictEqual(straightBishop.valid, false);
    assert.ok(straightBishop.ruleExplanation?.includes('bishop moves diagonally'));

    // Blocked path
    const blockedBishopGame = new Chess('4k3/8/8/4p3/3B4/8/8/4K3 w - - 0 1');
    const jumpBishop = validateMoveWithRules(blockedBishopGame, 'Bf6');
    assert.strictEqual(jumpBishop.valid, false);
    assert.ok(jumpBishop.ruleExplanation?.includes('path to that square is blocked'));
  });

  it('Queen movement: horizontal, vertical, and diagonal', () => {
    const queenGame = new Chess('4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1');
    assert.strictEqual(validateMoveWithRules(queenGame, 'Qd8+').valid, true);
    assert.strictEqual(validateMoveWithRules(queenGame, 'Qa4+').valid, true);
    assert.strictEqual(validateMoveWithRules(queenGame, 'Qh8+').valid, true);
  });

  it('King movement: 1 square only and cannot move onto attacked squares', () => {
    const kingGame = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    assert.strictEqual(validateMoveWithRules(kingGame, 'Ke2').valid, true);
    assert.strictEqual(validateMoveWithRules(kingGame, 'Kd1').valid, true);

    // King moving 2 squares without castling
    const twoSquareAttempt = validateMoveWithRules(kingGame, 'Ke3');
    assert.strictEqual(twoSquareAttempt.valid, false);
    assert.ok(twoSquareAttempt.ruleExplanation?.includes('king moves only 1 square'));

    // King moving into check
    const attackedSquareGame = new Chess('4k3/8/8/8/4r3/8/8/4K3 w - - 0 1');
    const moveIntoCheck = validateMoveWithRules(attackedSquareGame, 'Ke2');
    assert.strictEqual(moveIntoCheck.valid, false);
  });
});

describe('2. Castling Rules and Failure Diagnostics', () => {
  it('Castling both sides is legal when conditions are met', () => {
    const openGame = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    assert.strictEqual(validateMoveWithRules(openGame, 'O-O').valid, true);
    assert.strictEqual(validateMoveWithRules(openGame, 'O-O-O').valid, true);
  });

  it('Castling illegal when king or rook has moved', () => {
    // FEN with no castling rights (-)
    const movedGame = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1');
    const attempt = validateMoveWithRules(movedGame, 'O-O');
    assert.strictEqual(attempt.valid, false);
    assert.ok(attempt.ruleExplanation?.includes('already moved'));
  });

  it('Castling illegal when path between king and rook is blocked', () => {
    const blockedGame = new Chess('r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1');
    const attempt = validateMoveWithRules(blockedGame, 'O-O');
    assert.strictEqual(attempt.valid, false);
    assert.ok(attempt.ruleExplanation?.includes('path between king and rook is blocked'));
  });

  it('Castling illegal when king is currently in check', () => {
    const checkGame = new Chess('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1');
    const attempt = validateMoveWithRules(checkGame, 'O-O');
    assert.strictEqual(attempt.valid, false);
    assert.ok(attempt.ruleExplanation?.includes('while your king is in check'));
  });

  it('Castling illegal when king passes through an attacked square', () => {
    // Black rook attacks f1
    const transitGame = new Chess('r3k2r/8/8/8/5r2/8/8/R3K2R w KQkq - 0 1');
    const attempt = validateMoveWithRules(transitGame, 'O-O');
    assert.strictEqual(attempt.valid, false);
    assert.ok(attempt.ruleExplanation?.includes('pass through an attacked square (f1)'));
  });

  it('Castling illegal when king lands on an attacked square', () => {
    // Black rook attacks g1
    const landingGame = new Chess('r3k2r/8/8/8/6r1/8/8/R3K2R w KQkq - 0 1');
    const attempt = validateMoveWithRules(landingGame, 'O-O');
    assert.strictEqual(attempt.valid, false);
    assert.ok(attempt.ruleExplanation?.includes('land on an attacked square (g1)'));
  });
});

describe('3. En Passant Rules and Timing', () => {
  it('En passant is legal immediately after a 2-square pawn advance', () => {
    const game = new Chess();
    game.move('e4');
    game.move('a6');
    game.move('e5');
    game.move('d5'); // triggers d6 en passant target
    assert.strictEqual(game.fen().split(' ')[3], 'd6');

    const epValidation = validateMoveWithRules(game, 'exd6');
    assert.strictEqual(epValidation.valid, true);
  });

  it('En passant is ILLEGAL one move later', () => {
    const game = new Chess();
    game.move('e4');
    game.move('a6');
    game.move('e5');
    game.move('d5');
    // White plays something else, missing en passant window
    game.move('a3');
    game.move('h6');

    // Window has closed (target is '-')
    assert.strictEqual(game.fen().split(' ')[3], '-');
    const lateAttempt = validateMoveWithRules(game, 'exd6');
    assert.strictEqual(lateAttempt.valid, false);
    assert.ok(lateAttempt.ruleExplanation?.includes('En passant is only available on the move right after'));
  });
});

describe('4. Pawn Promotion', () => {
  it('Pawn promotion to Q, R, B, N are all legal and supported', () => {
    // White pawn on e7 with empty e8 promotion square
    const promoGame = new Chess('8/4P3/8/8/8/8/8/k3K3 w - - 0 1');
    const legalMoves = promoGame.moves();
    assert.ok(legalMoves.includes('e8=Q'));
    assert.ok(legalMoves.includes('e8=R'));
    assert.ok(legalMoves.includes('e8=B'));
    assert.ok(legalMoves.includes('e8=N'));

    // Validation accepts SAN with or without '=' or '+'
    assert.strictEqual(validateMoveWithRules(promoGame, 'e8=Q').valid, true);
    assert.strictEqual(validateMoveWithRules(promoGame, 'e8Q').valid, true);
    assert.strictEqual(validateMoveWithRules(promoGame, 'e8=R').valid, true);
    assert.strictEqual(validateMoveWithRules(promoGame, 'e8=B').valid, true);
    assert.strictEqual(validateMoveWithRules(promoGame, 'e8=N').valid, true);
  });
});

describe('5. Check and Pinned Pieces', () => {
  it('When in check, only moves that resolve the check are legal', () => {
    // White king on e1 in check by Black queen on h4
    const checkGame = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5P1q/8/PPPPP1PP/RNBQKBNR w KQkq - 1 3');
    assert.strictEqual(checkGame.inCheck(), true);

    // Blocking with g3 is legal
    assert.strictEqual(validateMoveWithRules(checkGame, 'g3').valid, true);

    // Unrelated moves leave king in check
    const illegalAttempt = validateMoveWithRules(checkGame, 'a3');
    assert.strictEqual(illegalAttempt.valid, false);
    assert.ok(illegalAttempt.ruleExplanation?.includes('leaves your king in check'));
  });

  it('Pinned piece cannot move if doing so exposes king to check', () => {
    // White knight on e2 is pinned to White king on e1 by Black rook on e8
    const pinGame = new Chess('k3r3/8/8/8/8/8/4N3/4K3 w - - 0 1');
    assert.strictEqual(pinGame.inCheck(), false);

    // Moving knight exposes king
    const pinMove = validateMoveWithRules(pinGame, 'Nd4');
    assert.strictEqual(pinMove.valid, false);
    assert.ok(pinMove.ruleExplanation?.includes('leaves your king in check'));
  });
});

describe('6. Game End Conditions', () => {
  it('Checkmate is correctly identified with winner and explanation', () => {
    // Fool's mate
    const mateGame = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
    const end = checkGameEnd(mateGame, 4, 200);
    assert.strictEqual(end.isOver, true);
    assert.strictEqual(end.result, '0-1');
    assert.strictEqual(end.reasonKey, 'resultCheckmate');
    assert.strictEqual(end.winnerColor, 'b');
    assert.ok(end.explanationEn?.includes('Checkmate: Black won'));
    assert.ok(end.explanationId?.includes('Skakmat: Hitam menang'));
  });

  it('Stalemate is correctly identified with explanation', () => {
    const stalemateGame = new Chess('k7/8/1Q6/8/8/8/8/4K3 b - - 0 1');
    const end = checkGameEnd(stalemateGame, 10, 200);
    assert.strictEqual(end.isOver, true);
    assert.strictEqual(end.result, '1/2-1/2');
    assert.strictEqual(end.reasonKey, 'resultStalemate');
    assert.ok(end.explanationEn?.includes('Draw by stalemate'));
    assert.ok(end.explanationId?.includes('pat (stalemate)'));
  });

  it('Insufficient material is correctly identified', () => {
    const bareKings = new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
    const end = checkGameEnd(bareKings, 20, 200);
    assert.strictEqual(end.isOver, true);
    assert.strictEqual(end.result, '1/2-1/2');
    assert.strictEqual(end.reasonKey, 'resultInsufficient');
  });

  it('Fifty-move rule is triggered at 100 halfmoves', () => {
    // Non-insufficient material board with halfmove clock at 100
    const fiftyGame = new Chess('4k3/8/8/8/8/8/8/R3K2r w - - 100 50');
    const end = checkGameEnd(fiftyGame, 100, 200);
    assert.strictEqual(end.isOver, true);
    assert.strictEqual(end.result, '1/2-1/2');
    assert.strictEqual(end.reasonKey, 'resultFiftyMove');
  });

  it('Move limit is triggered when plyCount >= maxPly', () => {
    const normalGame = new Chess();
    const end = checkGameEnd(normalGame, 200, 200);
    assert.strictEqual(end.isOver, true);
    assert.strictEqual(end.result, '1/2-1/2');
    assert.strictEqual(end.reasonKey, 'resultMoveLimit');
  });

  it('Localized game end explanation generator works for EN and ID', () => {
    const expEn = getGameEndExplanation('resultCheckmate', 'w', 'en');
    assert.ok(expEn.includes('Checkmate: White won'));

    const expId = getGameEndExplanation('resultCheckmate', 'w', 'id');
    assert.ok(expId.includes('Skakmat: Putih menang'));

    const staleId = getGameEndExplanation('resultStalemate', undefined, 'id');
    assert.ok(staleId.includes('pat (stalemate)'));
  });
});

describe('7. Model Move Parsing and Normalization', () => {
  it('Parses MOVE: <san> in standard, markdown, and castling formats', () => {
    assert.strictEqual(parseModelMoveStrict('Thinking...\nMOVE: e4').san, 'e4');
    assert.strictEqual(parseModelMoveStrict('Reasoning...\nMOVE: **Nf3**').san, 'Nf3');
    assert.strictEqual(parseModelMoveStrict('MOVE: `O-O`').san, 'O-O');
    assert.strictEqual(parseModelMoveStrict('MOVE: 0-0').san, 'O-O');
    assert.strictEqual(parseModelMoveStrict('MOVE: 0-0-0').san, 'O-O-O');
  });

  it('Rejects outputs that omit the MOVE: line', () => {
    const res = parseModelMoveStrict('I recommend playing e4 because it controls the center.');
    assert.strictEqual(res.san, null);
    assert.ok(res.error?.includes('Could not find required line format'));
  });

  it('Normalizes SAN with and without checks or promotions', () => {
    assert.strictEqual(normalizeSan('Qh5+'), 'Qh5');
    assert.strictEqual(normalizeSan('Qh5#'), 'Qh5');
    assert.strictEqual(normalizeSan('0-0'), 'O-O');
    assert.strictEqual(normalizeSan('e8Q'), 'e8=Q');
  });
});

describe('8. Position Facts and Live Prompt Builder', () => {
  it('Computes position facts: check, castling, en passant, promotion, tactics', () => {
    const game = new Chess();
    const facts = computePositionFacts(game);
    assert.strictEqual(facts.sideToMove, 'White');
    assert.strictEqual(facts.inCheck, false);
    assert.strictEqual(facts.castling.whiteRights.kingside, true);
    assert.strictEqual(facts.castling.whiteRights.queenside, true);
    assert.strictEqual(facts.enPassant.targetSquare, null);
    assert.strictEqual(facts.promotion.available, false);
    assert.strictEqual(facts.legalMovesSan.length, 20);
  });

  it('Identifies check attacking pieces and king square', () => {
    const checkGame = new Chess('rnb1kbnr/pppp1ppp/8/4p3/5P1q/8/PPPPP1PP/RNBQKBNR w KQkq - 1 3');
    const kingSq = findKingSquare(checkGame, 'w');
    assert.strictEqual(kingSq, 'e1');

    const facts = computePositionFacts(checkGame);
    assert.strictEqual(facts.inCheck, true);
    assert.ok(facts.checkMessage.includes('You are in CHECK by: Black Queen on h4'));
    assert.ok(facts.checkMessage.includes('Your move must resolve the check'));
  });

  it('Includes promotion options and advice in facts when available', () => {
    const promoGame = new Chess('8/4P3/8/8/8/8/8/k3K3 w - - 0 1');
    const facts = computePositionFacts(promoGame);
    assert.strictEqual(facts.promotion.available, true);
    assert.ok(facts.promotion.summary.includes('e8=Q'));
    assert.ok(facts.promotion.summary.includes('Choose your promotion piece deliberately'));
  });

  it('buildSystemPromptWithRules includes CHESS_RULES in English', () => {
    const systemPrompt = buildSystemPromptWithRules('White', 'game_123');
    assert.ok(systemPrompt.includes('PIECE MOVEMENT'));
    assert.ok(systemPrompt.includes('SPECIAL RULES'));
    assert.ok(systemPrompt.includes('Castling:'));
    assert.ok(systemPrompt.includes('En passant:'));
    assert.ok(systemPrompt.includes('Pawn promotion:'));
    assert.ok(systemPrompt.includes('GAME END'));
  });

  it('buildTurnUserPrompt includes live ASCII board, facts, and legal moves', () => {
    const game = new Chess();
    const userPrompt = buildTurnUserPrompt({
      game,
      gameId: 'game_456',
      pgnHistory: '1. e4 e5',
    });
    assert.ok(userPrompt.includes('[ASCII BOARD]'));
    assert.ok(userPrompt.includes('[CHECK STATUS]'));
    assert.ok(userPrompt.includes('[CASTLING STATUS]'));
    assert.ok(userPrompt.includes('[EN PASSANT]'));
    assert.ok(userPrompt.includes('[TACTICAL PIECE SAFETY: ATTACKED & HANGING PIECES]'));
    assert.ok(userPrompt.includes('[LEGAL MOVES (20 available)]'));
    assert.ok(userPrompt.includes('MOVE: <san>'));
  });

  it('CHESS_RULES and CHESS_RULES_ID contain full rules definitions', () => {
    assert.ok(CHESS_RULES.includes('Pawn: moves 1 square forward'));
    assert.ok(CHESS_RULES_ID.includes('Pion: melangkah 1 petak maju'));
    assert.ok(CHESS_RULES_ID.includes('Rokade:'));
    assert.ok(CHESS_RULES_ID.includes('En passant:'));
  });
});
