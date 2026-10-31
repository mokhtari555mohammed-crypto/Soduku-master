export type Language = 'ar' | 'en';
export type Theme = 'dark' | 'light';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar: string;
  createdAt: string;
  isGuest: boolean;
}

export interface Profile {
  userId: string;
  username: string;
  avatar: string;
  createdAt: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  correctMoves: number;
  bestStreak: number;
  currentStreak: number;
  rating: number;
  rankTitle: string;
}

export interface OfflineLevelProgress {
  levelNumber: number;
  stars: number;
  timeSeconds: number;
  completedAt: string;
}

export interface OfflineProgress {
  userId: string;
  unlockedLevel: number;
  levels: Record<number, OfflineLevelProgress>;
}

export interface MultiplayerCell {
  val: number;
  isClue: boolean;
  isCorrect: boolean;
  answeredByPlayerId?: string;
  lastWrongPlayerId?: string;
}

export interface MoveRecord {
  moveIndex: number;
  playerId: string;
  row: number;
  col: number;
  num: number;
  isCorrect: boolean;
  timestamp: string;
}

export interface MatchPlayer {
  id: string;
  username: string;
  avatar: string;
  score: number;
}

export interface MatchState {
  id: string;
  roomId?: string;
  isRandom: boolean;
  player1: MatchPlayer;
  player2: MatchPlayer;
  puzzleClues: number[][];
  gridState: MultiplayerCell[][];
  currentTurnPlayerId: string;
  turnStartedAt: number;
  turnTimeoutSeconds: number;
  totalBlanks: number;
  filledBlanks: number;
  status: 'playing' | 'finished' | 'abandoned';
  startedAt: string;
  endedAt?: string;
  winnerId?: string | null;
  isDraw?: boolean;
  moves: MoveRecord[];
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  guestId?: string;
  status: 'waiting' | 'playing' | 'finished';
  currentMatchId?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  createdAt: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  correctMoves: number;
  bestStreak: number;
  currentStreak: number;
  rating: number;
  rankTitle: string;
}
