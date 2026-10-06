import { Match, ModelPairingStat } from './types';

const SAVED_GAMES_KEY = 'ai_chess_saved_games';
const STATS_KEY = 'ai_chess_model_stats';

export function getSavedMatches(): Match[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_GAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load saved games:', err);
    return [];
  }
}

export function saveMatch(match: Match): void {
  if (typeof window === 'undefined') return;
  try {
    const games = getSavedMatches();
    // Prepend new match, limit to 50
    const filtered = games.filter((g) => g.id !== match.id);
    const updated = [match, ...filtered].slice(0, 50);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updated));

    // Update scoreboard stats
    updateScoreboardStats(match);
  } catch (err) {
    console.error('Failed to save match:', err);
  }
}

export function deleteSavedMatch(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const games = getSavedMatches();
    const updated = games.filter((g) => g.id !== id);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete match:', err);
  }
}

export function getScoreboardStats(): ModelPairingStat[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load scoreboard stats:', err);
    return [];
  }
}

function updateScoreboardStats(match: Match): void {
  if (!match.result || match.status !== 'finished') return;

  const mWhite = match.white.model || match.white.displayName;
  const mBlack = match.black.model || match.black.displayName;
  const pairingKey = `${mWhite} vs ${mBlack}`;

  const allStats = getScoreboardStats();
  let existing = allStats.find((s) => s.pairingKey === pairingKey);

  if (!existing) {
    existing = {
      pairingKey,
      whiteModel: mWhite,
      blackModel: mBlack,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      totalGames: 0,
      whiteAvgLatencyMs: 0,
      blackAvgLatencyMs: 0,
      whiteIllegalMoves: 0,
      blackIllegalMoves: 0,
      whiteTotalMoves: 0,
      blackTotalMoves: 0,
    };
    allStats.push(existing);
  }

  existing.totalGames += 1;
  if (match.result === '1-0') {
    existing.whiteWins += 1;
  } else if (match.result === '0-1') {
    existing.blackWins += 1;
  } else {
    existing.draws += 1;
  }

  // Calculate move metrics for this match
  for (const move of match.moves) {
    const isWhite = move.color === 'w';
    const failedAttemptsCount = move.attempts.filter((a) => a.error).length;

    if (isWhite) {
      existing.whiteTotalMoves += 1;
      existing.whiteIllegalMoves += failedAttemptsCount;
      const prevTotal = existing.whiteAvgLatencyMs * (existing.whiteTotalMoves - 1);
      existing.whiteAvgLatencyMs = Math.round((prevTotal + move.latencyMs) / existing.whiteTotalMoves);
    } else {
      existing.blackTotalMoves += 1;
      existing.blackIllegalMoves += failedAttemptsCount;
      const prevTotal = existing.blackAvgLatencyMs * (existing.blackTotalMoves - 1);
      existing.blackAvgLatencyMs = Math.round((prevTotal + move.latencyMs) / existing.blackTotalMoves);
    }
  }

  localStorage.setItem(STATS_KEY, JSON.stringify(allStats));
}
