import { Match, ModelPairingStat } from './types';
import { sanitizePlayerConfig } from './settings';

const SAVED_GAMES_KEY = 'ai_chess_saved_games';
const STATS_KEY = 'ai_chess_model_stats';

/**
 * Clean match data before saving to ensure NO credentials or secret tokens are ever stored.
 */
function sanitizeMatch(match: Match): Match {
  return {
    ...match,
    white: sanitizePlayerConfig(match.white),
    black: sanitizePlayerConfig(match.black),
  };
}

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
    const sanitized = sanitizeMatch(match);
    const games = getSavedMatches();
    // Prepend new match, limit to 50
    const filtered = games.filter((g) => g.id !== sanitized.id);
    const updated = [sanitized, ...filtered].slice(0, 50);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updated));

    // Update scoreboard stats
    updateScoreboardStats(sanitized);
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

export function clearAllSavedMatches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAVED_GAMES_KEY);
  } catch (err) {
    console.error('Failed to clear matches:', err);
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

export function clearScoreboardStats(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STATS_KEY);
  } catch (err) {
    console.error('Failed to clear stats:', err);
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

/**
 * Export saved matches as a JSON string file download.
 * Guarantees zero API keys are present.
 */
export function exportMatchesAsJson(): void {
  const matches = getSavedMatches();
  const sanitizedList = matches.map(sanitizeMatch);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizedList, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `ai_chess_games_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Import matches from a JSON string.
 */
export function importMatchesFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'File content is not an array of games.' };
    }

    const current = getSavedMatches();
    const existingIds = new Set(current.map((m) => m.id));
    const toAdd: Match[] = [];

    for (const item of parsed) {
      if (item && item.id && Array.isArray(item.moves)) {
        const clean = sanitizeMatch(item);
        if (!existingIds.has(clean.id)) {
          toAdd.push(clean);
          existingIds.add(clean.id);
        }
      }
    }

    const merged = [...toAdd, ...current].slice(0, 50);
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(merged));
    return { success: true, count: toAdd.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON file';
    return { success: false, count: 0, error: msg };
  }
}
