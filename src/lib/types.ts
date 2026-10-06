export type MatchStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';
export type PlayerColor = 'w' | 'b';
export type PlayerState = 'thinking' | 'waiting' | 'finished' | 'error';
export type PieceCode =
  | 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK'
  | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK';

export interface PlayerConfig {
  displayName: string;
  provider: 'openai' | 'openrouter' | 'groq' | 'ollama' | 'mock' | 'custom';
  model: string;
  baseUrl?: string;
  apiKey?: string; // Client-provided override (optional, server default used if omitted)
}

export interface MoveAttempt {
  raw: string;
  error?: string;
  san?: string;
}

export interface MoveRecord {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  reasoning: string;
  reasoningType: 'reasoning' | 'explanation';
  attempts: MoveAttempt[];
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
  forfeitRandom: boolean;
  evalCp?: number; // Centipawns from White's perspective (+ = White ahead, - = Black ahead)
  evalMate?: number; // Moves to mate
  classification?: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

export interface MatchSettings {
  moveDelayMs: number; // e.g. 0, 1000, 2000, 5000
  maxPly: number; // default 200
}

export interface Match {
  id: string;
  createdAt: string;
  status: MatchStatus;
  result?: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  terminationReason?: string;
  white: PlayerConfig;
  black: PlayerConfig;
  settings: MatchSettings;
  moves: MoveRecord[];
  currentFen: string;
  activeColor: PlayerColor;
  errorMessage?: string;
}

export interface ModelPairingStat {
  pairingKey: string;
  whiteModel: string;
  blackModel: string;
  whiteWins: number;
  blackWins: number;
  draws: number;
  totalGames: number;
  whiteAvgLatencyMs: number;
  blackAvgLatencyMs: number;
  whiteIllegalMoves: number;
  blackIllegalMoves: number;
  whiteTotalMoves: number;
  blackTotalMoves: number;
}
