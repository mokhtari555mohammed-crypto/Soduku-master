/**
 * Client-Side Sudoku Engine
 * Generates 100 deterministic, guaranteed solvable levels with unique solutions.
 * Provides hints, validation, and candidate calculations.
 */

export type Grid = number[][];

export interface LevelData {
  levelNumber: number;
  cluesCount: number;
  difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'expert';
  puzzle: Grid;
  solution: Grid;
}

// PRNG with seed
function createRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function isValidPlacement(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

export function getCandidates(grid: Grid, row: number, col: number): number[] {
  if (grid[row][col] !== 0) return [];
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(grid, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

function shuffle<T>(array: T[], rng = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function solveSudoku(grid: Grid, rng = Math.random): { solved: boolean; solution: Grid } {
  const board = cloneGrid(grid);

  function solve(): boolean {
    let emptyRow = -1;
    let emptyCol = -1;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const candidates = getCandidates(board, r, c);
          if (candidates.length === 0) return false;
          if (candidates.length < minCandidates) {
            minCandidates = candidates.length;
            emptyRow = r;
            emptyCol = c;
            if (minCandidates === 1) break;
          }
        }
      }
      if (minCandidates === 1) break;
    }

    if (emptyRow === -1) return true;

    const candidates = shuffle(getCandidates(board, emptyRow, emptyCol), rng);
    for (const num of candidates) {
      board[emptyRow][emptyCol] = num;
      if (solve()) return true;
      board[emptyRow][emptyCol] = 0;
    }

    return false;
  }

  const solved = solve();
  return { solved, solution: board };
}

export function countSolutions(grid: Grid, limit = 2): number {
  const board = cloneGrid(grid);
  let count = 0;

  function countRecursive(): void {
    if (count >= limit) return;

    let emptyRow = -1;
    let emptyCol = -1;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const cand = getCandidates(board, r, c);
          if (cand.length === 0) return;
          if (cand.length < minCandidates) {
            minCandidates = cand.length;
            emptyRow = r;
            emptyCol = c;
            if (minCandidates === 1) break;
          }
        }
      }
      if (minCandidates === 1) break;
    }

    if (emptyRow === -1) {
      count++;
      return;
    }

    const cand = getCandidates(board, emptyRow, emptyCol);
    for (const num of cand) {
      board[emptyRow][emptyCol] = num;
      countRecursive();
      board[emptyRow][emptyCol] = 0;
      if (count >= limit) return;
    }
  }

  countRecursive();
  return count;
}

// Map level number 1..100 to target clues count and difficulty
export function getLevelDifficulty(level: number): {
  cluesCount: number;
  difficulty: 'very_easy' | 'easy' | 'medium' | 'hard' | 'expert';
} {
  if (level === 1) {
    return { cluesCount: 52, difficulty: 'very_easy' };
  } else if (level <= 20) {
    // 50 down to 44
    const clues = Math.round(50 - ((level - 2) / 18) * 6);
    return { cluesCount: clues, difficulty: 'easy' };
  } else if (level <= 50) {
    // 43 down to 36
    const clues = Math.round(43 - ((level - 21) / 29) * 7);
    return { cluesCount: clues, difficulty: 'medium' };
  } else if (level <= 80) {
    // 35 down to 30
    const clues = Math.round(35 - ((level - 51) / 29) * 5);
    return { cluesCount: clues, difficulty: 'hard' };
  } else {
    // 29 down to 24
    const clues = Math.round(29 - ((level - 81) / 19) * 5);
    return { cluesCount: clues, difficulty: 'expert' };
  }
}

// Cache generated levels so navigating back to levels is instantaneous
const levelCache = new Map<number, LevelData>();

export function getOfflineLevel(levelNumber: number): LevelData {
  if (levelCache.has(levelNumber)) {
    return levelCache.get(levelNumber)!;
  }

  const { cluesCount, difficulty } = getLevelDifficulty(levelNumber);
  const seed = levelNumber * 982451653 + 12345;
  const rng = createRNG(seed);

  const empty = createEmptyGrid();
  // Fill diagonal blocks
  for (let box = 0; box < 9; box += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        empty[box + r][box + c] = nums[idx++];
      }
    }
  }

  const { solution } = solveSudoku(empty, rng);
  const puzzle = cloneGrid(solution);

  // Positions to remove
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions, rng);

  let currentClues = 81;
  for (const [r, c] of shuffledPositions) {
    if (currentClues <= cluesCount) break;

    const temp = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      currentClues--;
    } else {
      puzzle[r][c] = temp;
    }
  }

  const data: LevelData = {
    levelNumber,
    cluesCount: currentClues,
    difficulty,
    puzzle,
    solution,
  };

  levelCache.set(levelNumber, data);
  return data;
}

// Find conflicts in a user-modified board
export function findBoardConflicts(currentGrid: Grid, initialClues: Grid): {
  rowConflicts: Set<string>;
  colConflicts: Set<string>;
  boxConflicts: Set<string>;
  wrongCells: Set<string>;
} {
  const rowConflicts = new Set<string>();
  const colConflicts = new Set<string>();
  const boxConflicts = new Set<string>();
  const wrongCells = new Set<string>();

  // Check rows
  for (let r = 0; r < 9; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c++) {
      const v = currentGrid[r][c];
      if (v !== 0) {
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(c);
      }
    }
    for (const cols of seen.values()) {
      if (cols.length > 1) {
        for (const c of cols) {
          rowConflicts.add(`${r},${c}`);
        }
      }
    }
  }

  // Check cols
  for (let c = 0; c < 9; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r++) {
      const v = currentGrid[r][c];
      if (v !== 0) {
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(r);
      }
    }
    for (const rows of seen.values()) {
      if (rows.length > 1) {
        for (const r of rows) {
          colConflicts.add(`${r},${c}`);
        }
      }
    }
  }

  // Check boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Map<number, [number, number][]>();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = br * 3 + r;
          const col = bc * 3 + c;
          const v = currentGrid[row][col];
          if (v !== 0) {
            if (!seen.has(v)) seen.set(v, []);
            seen.get(v)!.push([row, col]);
          }
        }
      }
      for (const cells of seen.values()) {
        if (cells.length > 1) {
          for (const [r, c] of cells) {
            boxConflicts.add(`${r},${c}`);
          }
        }
      }
    }
  }

  return { rowConflicts, colConflicts, boxConflicts, wrongCells };
}

// Generate smart hint
export function getSmartHint(currentGrid: Grid, solution: Grid): {
  row: number;
  col: number;
  num: number;
  explanationAr: string;
  explanationEn: string;
} | null {
  // 1. Look for naked singles first
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] === 0) {
        const candidates = getCandidates(currentGrid, r, c);
        if (candidates.length === 1) {
          const num = candidates[0];
          return {
            row: r,
            col: c,
            num,
            explanationAr: `الخانة في الصف ${r + 1} والعمود ${c + 1} لا تقبل سوى الرقم ${num}`,
            explanationEn: `Cell at row ${r + 1}, column ${c + 1} has only one valid candidate: ${num}`,
          };
        }
      }
    }
  }

  // 2. Fallback to any empty cell based on solution
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (currentGrid[r][c] === 0) {
        const num = solution[r][c];
        return {
          row: r,
          col: c,
          num,
          explanationAr: `كشف الرقم ${num} في الصف ${r + 1} والعمود ${c + 1}`,
          explanationEn: `Revealed number ${num} at row ${r + 1}, col ${c + 1}`,
        };
      }
    }
  }

  return null;
}
