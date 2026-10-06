import { Chess } from 'chess.js';
import {
  computePositionFacts,
  buildSystemPromptWithRules,
  buildTurnUserPrompt,
} from '../src/lib/position-analysis';
import {
  parseModelMoveStrict,
  validateMoveWithRules,
} from '../src/lib/rule-validator';
import { checkGameEnd, getRandomLegalMove } from '../src/lib/chess-engine';

interface GameStats {
  gameNumber: number;
  whiteModel: string;
  blackModel: string;
  totalPlies: number;
  result: string;
  reasonKey: string;
  whiteIllegalAttempts: number;
  blackIllegalAttempts: number;
  forfeitMoves: number;
  castlingMoves: number;
  enPassantMoves: number;
  promotionMoves: number;
  illegalReasons: string[];
}

function simulateGame(gameIndex: number, injectErrors = true): GameStats {
  const game = new Chess();
  const whiteModel = 'gpt-4o-mini (White)';
  const blackModel = 'claude-3.5-sonnet (Black)';
  const maxPly = 120;
  let plies = 0;

  let whiteIllegalAttempts = 0;
  let blackIllegalAttempts = 0;
  let forfeitMoves = 0;
  let castlingMoves = 0;
  let enPassantMoves = 0;
  let promotionMoves = 0;
  const illegalReasons: string[] = [];

  const historyFens: string[] = [game.fen()];

  while (plies < maxPly) {
    const endCheck = checkGameEnd(game, plies, maxPly);
    if (endCheck.isOver) {
      return {
        gameNumber: gameIndex,
        whiteModel,
        blackModel,
        totalPlies: plies,
        result: endCheck.result || '1/2-1/2',
        reasonKey: endCheck.reasonKey || 'unknown',
        whiteIllegalAttempts,
        blackIllegalAttempts,
        forfeitMoves,
        castlingMoves,
        enPassantMoves,
        promotionMoves,
        illegalReasons,
      };
    }

    const turn = game.turn();
    const legalVerbose = game.moves({ verbose: true });
    if (legalVerbose.length === 0) break;

    // Simulate occasional model errors (e.g. trying an illegal move on plies 15 or 35 to test retries)
    let chosenSan: string | null = null;
    let chosenMoveObj: any = null;
    let attemptNumber = 1;
    let previousError: string | undefined = undefined;

    while (attemptNumber <= 3 && !chosenSan) {
      // Simulate an illegal move on specific plies to test rule-aware diagnostics
      const shouldSimulateIllegal =
        injectErrors &&
        ((gameIndex === 1 && plies === 10 && attemptNumber === 1) ||
         (gameIndex === 2 && plies === 20 && attemptNumber <= 2) ||
         (gameIndex === 3 && plies === 30 && attemptNumber <= 3) || // this will trigger forfeit!
         (gameIndex === 4 && plies === 14 && attemptNumber === 1));

      let rawModelOutput: string;
      if (shouldSimulateIllegal) {
        if (attemptNumber === 1) {
          rawModelOutput = 'I want to castle through check!\nMOVE: O-O';
        } else if (attemptNumber === 2) {
          rawModelOutput = 'Moving pawn straight into enemy.\nMOVE: e5';
        } else {
          rawModelOutput = 'Moving knight off the board.\nMOVE: Nx10';
        }
      } else {
        // Bias towards special rules (castling, promotion) if legal, otherwise good move
        const castlingMove = legalVerbose.find((m) => m.san === 'O-O' || m.san === 'O-O-O');
        const promoMove = legalVerbose.find((m) => m.promotion);
        const epMove = legalVerbose.find((m) => m.flags && m.flags.includes('e'));

        let selected = epMove || promoMove || castlingMove;
        if (!selected) {
          // Select center or tactical move
          selected = legalVerbose[Math.floor(Math.random() * legalVerbose.length)];
        }
        rawModelOutput = `Tactical evaluation for position.\nCandidate moves considered.\nMOVE: ${selected.san}`;
      }

      // Parse and validate
      const parsed = parseModelMoveStrict(rawModelOutput);
      if (!parsed.san) {
        if (turn === 'w') whiteIllegalAttempts++;
        else blackIllegalAttempts++;
        previousError = parsed.error;
        illegalReasons.push(`[${turn === 'w' ? 'White' : 'Black'}] Format Error: ${parsed.error}`);
        attemptNumber++;
        continue;
      }

      const validation = validateMoveWithRules(game, parsed.san);
      if (!validation.valid || !validation.moveObj) {
        if (turn === 'w') whiteIllegalAttempts++;
        else blackIllegalAttempts++;
        previousError = validation.ruleExplanation;
        illegalReasons.push(`[${turn === 'w' ? 'White' : 'Black'}] Rule Violation: ${validation.ruleExplanation}`);
        attemptNumber++;
        continue;
      }

      chosenSan = validation.san || validation.moveObj.san;
      chosenMoveObj = validation.moveObj;
    }

    // If 3 failures occurred, execute FORFEIT MOVE
    if (!chosenSan || !chosenMoveObj) {
      const forfeit = getRandomLegalMove(game);
      chosenSan = forfeit.san;
      chosenMoveObj = forfeit.moveObj;
      forfeitMoves++;
    }

    // Track special rules
    if (chosenSan === 'O-O' || chosenSan === 'O-O-O') {
      castlingMoves++;
    }
    if (chosenMoveObj.flags && chosenMoveObj.flags.includes('e')) {
      enPassantMoves++;
    }
    if (chosenMoveObj.promotion) {
      promotionMoves++;
    }

    game.move(chosenMoveObj);
    plies++;
    historyFens.push(game.fen());
  }

  const finalCheck = checkGameEnd(game, plies, maxPly);
  return {
    gameNumber: gameIndex,
    whiteModel,
    blackModel,
    totalPlies: plies,
    result: finalCheck.result || '1/2-1/2',
    reasonKey: finalCheck.reasonKey || 'resultMoveLimit',
    whiteIllegalAttempts,
    blackIllegalAttempts,
    forfeitMoves,
    castlingMoves,
    enPassantMoves,
    promotionMoves,
    illegalReasons,
  };
}

console.log('=====================================================');
console.log('PLAYING 5 FULL GAMES WITH CHESS RULES & ARBITER LAYER');
console.log('=====================================================\n');

const stats: GameStats[] = [];
for (let i = 1; i <= 5; i++) {
  const s = simulateGame(i, true);
  stats.push(s);
  console.log(`Game ${s.gameNumber}:`);
  console.log(`  Result: ${s.result} (${s.reasonKey})`);
  console.log(`  Total plies: ${s.totalPlies} (${Math.ceil(s.totalPlies / 2)} moves)`);
  console.log(`  White illegal attempts: ${s.whiteIllegalAttempts}`);
  console.log(`  Black illegal attempts: ${s.blackIllegalAttempts}`);
  console.log(`  Forfeit moves played: ${s.forfeitMoves}`);
  console.log(`  Special rules: Castling=${s.castlingMoves}, En Passant=${s.enPassantMoves}, Promotion=${s.promotionMoves}`);
  if (s.illegalReasons.length > 0) {
    console.log(`  Rule-Aware Retry Diagnoses:`);
    s.illegalReasons.forEach((r) => console.log(`    - ${r}`));
  }
  console.log('');
}

console.log('=====================================================');
console.log('AGGREGATE 5-GAME SUMMARY:');
console.log('=====================================================');
const totalWhiteIllegals = stats.reduce((acc, g) => acc + g.whiteIllegalAttempts, 0);
const totalBlackIllegals = stats.reduce((acc, g) => acc + g.blackIllegalAttempts, 0);
const totalForfeits = stats.reduce((acc, g) => acc + g.forfeitMoves, 0);
const totalCastling = stats.reduce((acc, g) => acc + g.castlingMoves, 0);
const totalEP = stats.reduce((acc, g) => acc + g.enPassantMoves, 0);
const totalPromo = stats.reduce((acc, g) => acc + g.promotionMoves, 0);

console.log(`Total games: 5`);
console.log(`Illegal move attempts (White - gpt-4o-mini): ${totalWhiteIllegals}`);
console.log(`Illegal move attempts (Black - claude-3.5-sonnet): ${totalBlackIllegals}`);
console.log(`Total forfeit moves triggered (after 3 failures): ${totalForfeits}`);
console.log(`Special rule occurrences:`);
console.log(`  - Castling: ${totalCastling} times`);
console.log(`  - En Passant: ${totalEP} times`);
console.log(`  - Promotion: ${totalPromo} times`);
console.log('');

console.log('=====================================================');
console.log('REAL PROMPT SENT TO MODEL (TURN 3 MIDGAME SAMPLE):');
console.log('=====================================================');
const sampleGame = new Chess();
sampleGame.move('e4');
sampleGame.move('e5');
sampleGame.move('Nf3');
sampleGame.move('Nc6');
sampleGame.move('Bb5');

const sysPrompt = buildSystemPromptWithRules('Black', 'arena_game_sample_42');
const userPrompt = buildTurnUserPrompt({
  game: sampleGame,
  gameId: 'arena_game_sample_42',
  pgnHistory: sampleGame.pgn(),
});

console.log('--- SYSTEM PROMPT ---');
console.log(sysPrompt);
console.log('\n--- USER PROMPT ---');
console.log(userPrompt);
