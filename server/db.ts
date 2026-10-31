import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  email?: string;
  passwordHash?: string;
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
  winRate: number; // percentage 0-100
  correctMoves: number;
  bestStreak: number;
  currentStreak: number;
  rating: number; // ELO / score rating starting at 1000
  rankTitle: string;
}

export interface OfflineLevelProgress {
  levelNumber: number;
  stars: number; // 1-3
  timeSeconds: number;
  completedAt: string;
}

export interface OfflineProgress {
  userId: string;
  unlockedLevel: number; // 1..100
  levels: Record<number, OfflineLevelProgress>;
}

export interface CellState {
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

export interface Match {
  id: string;
  roomId?: string;
  isRandom: boolean;
  player1: {
    id: string;
    username: string;
    avatar: string;
    score: number;
  };
  player2: {
    id: string;
    username: string;
    avatar: string;
    score: number;
  };
  puzzleClues: number[][]; // original clues (0 for empty)
  secretSolution: number[][]; // NEVER sent to client in state broadcasts!
  gridState: CellState[][]; // current public board state
  currentTurnPlayerId: string;
  turnStartedAt: number; // timestamp in ms
  turnTimeoutSeconds: number; // e.g. 30s
  totalBlanks: number;
  filledBlanks: number;
  status: 'playing' | 'finished' | 'abandoned';
  startedAt: string;
  endedAt?: string;
  winnerId?: string | null; // null if draw
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

export interface DatabaseSchema {
  users: Record<string, User>;
  profiles: Record<string, Profile>;
  offlineProgress: Record<string, OfflineProgress>;
  rooms: Record<string, Room>;
  matches: Record<string, Match>;
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'sudoku_db.json');

class Database {
  private data: DatabaseSchema = {
    users: {},
    profiles: {},
    offlineProgress: {},
    rooms: {},
    matches: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      }
      if (Object.keys(this.data.profiles).length === 0) {
        this.seedInitialData();
      }
      this.save();
    } catch (err) {
      console.error('Failed to load DB, initializing with empty state', err);
    }
  }

  private seedInitialData() {
    const seeds = [
      { id: 'champ_1', username: 'طارق_الأسطورة', avatar: 'user_1', rating: 2150, wins: 48, matches: 54, correct: 412, bestStreak: 12 },
      { id: 'champ_2', username: 'Sarah_Mind', avatar: 'user_2', rating: 1980, wins: 42, matches: 50, correct: 380, bestStreak: 9 },
      { id: 'champ_3', username: 'سودوكو_ماستر', avatar: 'user_3', rating: 1890, wins: 36, matches: 45, correct: 320, bestStreak: 8 },
      { id: 'champ_4', username: 'Kareem_Logic', avatar: 'user_4', rating: 1720, wins: 29, matches: 38, correct: 275, bestStreak: 6 },
      { id: 'champ_5', username: 'Noura_Pro', avatar: 'user_5', rating: 1640, wins: 25, matches: 34, correct: 230, bestStreak: 5 },
    ];
    for (const s of seeds) {
      this.data.users[s.id] = {
        id: s.id,
        username: s.username,
        avatar: s.avatar,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        isGuest: false,
      };
      this.data.profiles[s.id] = {
        userId: s.id,
        username: s.username,
        avatar: s.avatar,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        matches: s.matches,
        wins: s.wins,
        losses: s.matches - s.wins,
        draws: 0,
        winRate: Math.round((s.wins / s.matches) * 100),
        correctMoves: s.correct,
        bestStreak: s.bestStreak,
        currentStreak: 2,
        rating: s.rating,
        rankTitle: this.getRankTitle(s.rating),
      };
    }
  }

  private save() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB file', err);
    }
  }

  public getRankTitle(rating: number): string {
    if (rating >= 2000) return 'Grandmaster';
    if (rating >= 1600) return 'Master';
    if (rating >= 1300) return 'Strategist';
    if (rating >= 1100) return 'Adept';
    return 'Novice';
  }

  // --- Users & Profiles ---
  public getUserById(id: string): User | undefined {
    return this.data.users[id];
  }

  public getUserByEmail(email: string): User | undefined {
    const lower = email.toLowerCase().trim();
    return Object.values(this.data.users).find((u) => u.email?.toLowerCase() === lower);
  }

  public getUserByUsername(username: string): User | undefined {
    const lower = username.toLowerCase().trim();
    return Object.values(this.data.users).find((u) => u.username.toLowerCase() === lower);
  }

  public createUser(user: User): User {
    this.data.users[user.id] = user;
    this.data.profiles[user.id] = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      correctMoves: 0,
      bestStreak: 0,
      currentStreak: 0,
      rating: 1000,
      rankTitle: 'Novice',
    };
    if (!this.data.offlineProgress[user.id]) {
      this.data.offlineProgress[user.id] = {
        userId: user.id,
        unlockedLevel: 1,
        levels: {},
      };
    }
    this.save();
    return user;
  }

  public getProfile(userId: string): Profile | undefined {
    return this.data.profiles[userId];
  }

  public updateProfile(userId: string, updates: Partial<Profile>): Profile | undefined {
    const prof = this.data.profiles[userId];
    if (!prof) return undefined;
    Object.assign(prof, updates);
    if (updates.rating) {
      prof.rankTitle = this.getRankTitle(prof.rating);
    }
    if (this.data.users[userId]) {
      if (updates.username) this.data.users[userId].username = updates.username;
      if (updates.avatar) this.data.users[userId].avatar = updates.avatar;
    }
    this.save();
    return prof;
  }

  // --- Offline Progress ---
  public getOfflineProgress(userId: string): OfflineProgress {
    if (!this.data.offlineProgress[userId]) {
      this.data.offlineProgress[userId] = {
        userId,
        unlockedLevel: 1,
        levels: {},
      };
      this.save();
    }
    return this.data.offlineProgress[userId];
  }

  public completeOfflineLevel(
    userId: string,
    levelNumber: number,
    stars: number,
    timeSeconds: number
  ): OfflineProgress {
    const prog = this.getOfflineProgress(userId);
    const existing = prog.levels[levelNumber];
    prog.levels[levelNumber] = {
      levelNumber,
      stars: existing ? Math.max(existing.stars, stars) : stars,
      timeSeconds: existing ? Math.min(existing.timeSeconds, timeSeconds) : timeSeconds,
      completedAt: new Date().toISOString(),
    };
    if (prog.unlockedLevel <= levelNumber && levelNumber < 100) {
      prog.unlockedLevel = levelNumber + 1;
    }
    this.save();
    return prog;
  }

  // --- Rooms ---
  public createRoom(hostId: string): Room {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const room: Room = {
      id,
      code,
      hostId,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };
    this.data.rooms[id] = room;
    this.save();
    return room;
  }

  public getRoomByCode(code: string): Room | undefined {
    const formatted = code.trim().toUpperCase();
    return Object.values(this.data.rooms).find((r) => r.code === formatted && r.status !== 'finished');
  }

  public getRoomById(id: string): Room | undefined {
    return this.data.rooms[id];
  }

  public updateRoom(roomId: string, updates: Partial<Room>): Room | undefined {
    const room = this.data.rooms[roomId];
    if (!room) return undefined;
    Object.assign(room, updates);
    this.save();
    return room;
  }

  // --- Matches ---
  public createMatch(match: Match): Match {
    this.data.matches[match.id] = match;
    this.save();
    return match;
  }

  public getMatch(id: string): Match | undefined {
    return this.data.matches[id];
  }

  public updateMatch(matchId: string, updates: Partial<Match>): Match | undefined {
    const match = this.data.matches[matchId];
    if (!match) return undefined;
    Object.assign(match, updates);
    this.save();
    return match;
  }

  public recordMatchOutcome(
    matchId: string,
    winnerId: string | null,
    isDraw: boolean
  ): Match | undefined {
    const match = this.data.matches[matchId];
    if (!match || match.status === 'finished') return match;

    match.status = 'finished';
    match.endedAt = new Date().toISOString();
    match.winnerId = winnerId;
    match.isDraw = isDraw;

    const p1 = this.getProfile(match.player1.id);
    const p2 = this.getProfile(match.player2.id);

    if (p1 && p2) {
      p1.matches++;
      p2.matches++;
      p1.correctMoves += match.player1.score;
      p2.correctMoves += match.player2.score;

      if (isDraw) {
        p1.draws++;
        p2.draws++;
        p1.currentStreak = 0;
        p2.currentStreak = 0;
        p1.rating += 5;
        p2.rating += 5;
      } else if (winnerId === p1.userId) {
        p1.wins++;
        p2.losses++;
        p1.currentStreak++;
        p1.bestStreak = Math.max(p1.bestStreak, p1.currentStreak);
        p2.currentStreak = 0;
        p1.rating += 25;
        p2.rating = Math.max(800, p2.rating - 15);
      } else if (winnerId === p2.userId) {
        p2.wins++;
        p1.losses++;
        p2.currentStreak++;
        p2.bestStreak = Math.max(p2.bestStreak, p2.currentStreak);
        p1.currentStreak = 0;
        p2.rating += 25;
        p1.rating = Math.max(800, p1.rating - 15);
      }

      p1.winRate = Math.round((p1.wins / p1.matches) * 100);
      p2.winRate = Math.round((p2.wins / p2.matches) * 100);
      p1.rankTitle = this.getRankTitle(p1.rating);
      p2.rankTitle = this.getRankTitle(p2.rating);
    }

    this.save();
    return match;
  }

  // --- Leaderboards ---
  public getLeaderboard(period: 'all' | 'monthly' | 'weekly' | 'daily' = 'all') {
    // For demo/production, filter matches within period or profile aggregate
    const now = Date.now();
    let minTime = 0;
    if (period === 'daily') minTime = now - 24 * 60 * 60 * 1000;
    else if (period === 'weekly') minTime = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === 'monthly') minTime = now - 30 * 24 * 60 * 60 * 1000;

    if (period === 'all') {
      const list = Object.values(this.data.profiles)
        .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.rating - a.rating)
        .slice(0, 50);
      return list;
    }

    // Filter matches within period to compute period-specific wins
    const periodStats: Record<string, { wins: number; matches: number; correctMoves: number }> = {};
    for (const match of Object.values(this.data.matches)) {
      if (match.status === 'finished' && match.endedAt) {
        const time = new Date(match.endedAt).getTime();
        if (time >= minTime) {
          const p1Id = match.player1.id;
          const p2Id = match.player2.id;
          if (!periodStats[p1Id]) periodStats[p1Id] = { wins: 0, matches: 0, correctMoves: 0 };
          if (!periodStats[p2Id]) periodStats[p2Id] = { wins: 0, matches: 0, correctMoves: 0 };

          periodStats[p1Id].matches++;
          periodStats[p2Id].matches++;
          periodStats[p1Id].correctMoves += match.player1.score;
          periodStats[p2Id].correctMoves += match.player2.score;

          if (match.winnerId === p1Id) periodStats[p1Id].wins++;
          if (match.winnerId === p2Id) periodStats[p2Id].wins++;
        }
      }
    }

    const result = Object.entries(periodStats).map(([userId, stats]) => {
      const base = this.data.profiles[userId] || {
        username: 'Player',
        avatar: 'user_1',
        rating: 1000,
        rankTitle: 'Novice',
      };
      return {
        userId,
        username: base.username,
        avatar: base.avatar,
        createdAt: base.createdAt,
        matches: stats.matches,
        wins: stats.wins,
        losses: stats.matches - stats.wins,
        draws: 0,
        winRate: stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0,
        correctMoves: stats.correctMoves,
        bestStreak: base.bestStreak,
        currentStreak: base.currentStreak,
        rating: base.rating,
        rankTitle: base.rankTitle,
      };
    });

    return result.sort((a, b) => b.wins - a.wins || b.correctMoves - a.correctMoves).slice(0, 50);
  }
}

export const db = new Database();
