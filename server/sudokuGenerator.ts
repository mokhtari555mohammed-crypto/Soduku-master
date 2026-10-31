/**
 * High-performance Sudoku Generator & Solver
 * Provides guaranteed solvable boards with unique solutions
 */

export type Grid = number[][];

// Fast pseudo-random number generator for deterministic levels
export function createRNG(seed: number) {
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

// Solve grid using backtracking
export function solveSudoku(grid: Grid, rng = Math.random): { solved: boolean; solution: Grid } {
  const board = cloneGrid(grid);

  function solve(): boolean {
    let emptyRow = -1;
    let emptyCol = -1;
    let minCandidates = 10;

    // Minimum remaining values heuristic
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

    if (emptyRow === -1) return true; // All filled

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

// Counts number of solutions up to limit (used to verify unique solution)
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

/**
 * Generate a complete solved valid grid, then remove clues while maintaining uniqueness
 */
export function generateSudoku(clueCount: number, seed?: number): { puzzle: Grid; solution: Grid } {
  const rng = seed !== undefined ? createRNG(seed) : Math.random;
  const empty = createEmptyGrid();
  
  // Fill diagonal 3x3 blocks first (they are independent)
  for (let box = 0; box < 9; box += 3) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    let idx = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        empty[box + r][box + c] = nums[idx++];
      }
    }
  }

  // Solve the rest
  const { solved, solution } = solveSudoku(empty, rng);
  if (!solved) {
    // Fallback if random diagonal led to dead end (rare)
    return generateSudoku(clueCount, (seed ?? 12345) + 1);
  }

  const puzzle = cloneGrid(solution);

  // Generate list of positions to attempt removing
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions, rng);

  let currentClues = 81;
  for (const [r, c] of shuffledPositions) {
    if (currentClues <= clueCount) break;

    const temp = puzzle[r][c];
    puzzle[r][c] = 0;

    // Check if still uniquely solvable
    if (countSolutions(puzzle, 2) === 1) {
      currentClues--;
    } else {
      puzzle[r][c] = temp; // Revert
    }
  }

  return { puzzle, solution };
}
