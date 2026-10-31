import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { SudokuBoard } from './SudokuBoard';
import { Keypad } from './Keypad';
import {
  getOfflineLevel,
  LevelData,
  findBoardConflicts,
  getSmartHint,
} from '../utils/sudokuEngine';
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Star,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/sound';

interface CellHistory {
  row: number;
  col: number;
  prevVal: number;
  prevNotes: number[];
  newVal: number;
  newNotes: number[];
}

export const OfflineGame: React.FC = () => {
  const {
    lang,
    setScreen,
    currentOfflineLevel,
    setCurrentOfflineLevel,
    completeOfflineLevel,
    highlightDuplicates,
    highlightSameNumbers,
    t,
  } = useGame();

  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [grid, setGrid] = useState<{
    val: number;
    isClue: boolean;
    notes: number[];
    isError?: boolean;
  }[][]>([]);

  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [history, setHistory] = useState<CellHistory[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState<number>(3);
  const [mistakes, setMistakes] = useState<number>(0);
  const [timeSeconds, setTimeSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [earnedStars, setEarnedStars] = useState<number>(3);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load level data
  useEffect(() => {
    const data = getOfflineLevel(currentOfflineLevel);
    setLevelData(data);

    // Initial grid state
    const initialGrid = data.puzzle.map((row) =>
      row.map((val) => ({
        val,
        isClue: val !== 0,
        notes: [],
        isError: false,
      }))
    );

    setGrid(initialGrid);
    setSelectedCell(null);
    setHistory([]);
    setHintsRemaining(3);
    setMistakes(0);
    setTimeSeconds(0);
    setIsPaused(false);
    setIsCompleted(false);
    setHintMessage(null);
  }, [currentOfflineLevel]);

  // Timer interval
  useEffect(() => {
    if (isPaused || isCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isCompleted]);

  // Check board completion
  const checkGridSolved = useCallback(
    (currentGridState: typeof grid) => {
      if (!levelData) return;

      // Check if all cells filled and match solution
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (currentGridState[r][c].val === 0) return;
          if (currentGridState[r][c].val !== levelData.solution[r][c]) return;
        }
      }

      // If reached here: Solved!
      setIsCompleted(true);
      sound.playVictory();

      // Confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Calculate stars: 3 stars if <= 2 mistakes and good time, 2 stars if <= 4 mistakes, else 1
      let stars = 3;
      if (mistakes > 4 || hintsRemaining === 0) stars = 1;
      else if (mistakes > 2) stars = 2;
      setEarnedStars(stars);

      completeOfflineLevel(currentOfflineLevel, stars, timeSeconds);
    },
    [levelData, mistakes, hintsRemaining, timeSeconds, completeOfflineLevel, currentOfflineLevel]
  );

  // Cell Selection
  const handleSelectCell = (row: number, col: number) => {
    if (isPaused || isCompleted) return;
    setSelectedCell([row, col]);
  };

  // Keyboard navigation & number input support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isCompleted || !selectedCell) return;
      const [r, c] = selectedCell;

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleErase();
      } else if (e.key === 'ArrowUp' && r > 0) {
        setSelectedCell([r - 1, c]);
      } else if (e.key === 'ArrowDown' && r < 8) {
        setSelectedCell([r + 1, c]);
      } else if (e.key === 'ArrowLeft' && c > 0) {
        setSelectedCell([r, c - 1]);
      } else if (e.key === 'ArrowRight' && c < 8) {
        setSelectedCell([r, c + 1]);
      } else if (e.key.toLowerCase() === 'n') {
        setNotesMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isPaused, isCompleted]);

  // Number input
  const handleNumberInput = (num: number) => {
    if (!selectedCell || isPaused || isCompleted || !levelData) return;
    const [r, c] = selectedCell;
    const targetCell = grid[r][c];

    // Cannot modify clues
    if (targetCell.isClue) return;

    if (notesMode) {
      // Toggle note candidate
      const currentNotes = [...targetCell.notes];
      const noteIdx = currentNotes.indexOf(num);
      let newNotes: number[];
      if (noteIdx >= 0) {
        newNotes = currentNotes.filter((n) => n !== num);
      } else {
        newNotes = [...currentNotes, num].sort((a, b) => a - b);
      }

      setHistory((prev) => [
        ...prev,
        {
          row: r,
          col: c,
          prevVal: targetCell.val,
          prevNotes: targetCell.notes,
          newVal: targetCell.val,
          newNotes,
        },
      ]);

      setGrid((prev) => {
        const next = prev.map((rowArr) => rowArr.map((cell) => ({ ...cell })));
        next[r][c].notes = newNotes;
        return next;
      });
      return;
    }

    // Pen Mode (Place Number)
    const isError = num !== levelData.solution[r][c];
    if (isError) {
      sound.playWrong();
      setMistakes((m) => m + 1);
    } else {
      sound.playCorrect();
    }

    setHistory((prev) => [
      ...prev,
      {
        row: r,
        col: c,
        prevVal: targetCell.val,
        prevNotes: targetCell.notes,
        newVal: num,
        newNotes: [],
      },
    ]);

    const nextGrid = grid.map((rowArr) => rowArr.map((cell) => ({ ...cell })));
    nextGrid[r][c].val = num;
    nextGrid[r][c].notes = [];
    nextGrid[r][c].isError = isError;

    // Recalculate duplicate conflicts
    const rawMatrix = nextGrid.map((rowArr) => rowArr.map((cell) => cell.val));
    const conflicts = findBoardConflicts(rawMatrix, levelData.puzzle);

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (!nextGrid[i][j].isClue && nextGrid[i][j].val !== 0) {
          const isConflict =
            conflicts.rowConflicts.has(`${i},${j}`) ||
            conflicts.colConflicts.has(`${i},${j}`) ||
            conflicts.boxConflicts.has(`${i},${j}`);
          nextGrid[i][j].isError = isConflict || nextGrid[i][j].val !== levelData.solution[i][j];
        }
      }
    }

    setGrid(nextGrid);
    checkGridSolved(nextGrid);
  };

  // Erase
  const handleErase = () => {
    if (!selectedCell || isPaused || isCompleted) return;
    const [r, c] = selectedCell;
    const targetCell = grid[r][c];
    if (targetCell.isClue || (targetCell.val === 0 && targetCell.notes.length === 0)) return;

    setHistory((prev) => [
      ...prev,
      {
        row: r,
        col: c,
        prevVal: targetCell.val,
        prevNotes: targetCell.notes,
        newVal: 0,
        newNotes: [],
      },
    ]);

    setGrid((prev) => {
      const next = prev.map((rowArr) => rowArr.map((cell) => ({ ...cell })));
      next[r][c].val = 0;
      next[r][c].notes = [];
      next[r][c].isError = false;
      return next;
    });
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isPaused || isCompleted) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    setGrid((prev) => {
      const next = prev.map((rowArr) => rowArr.map((cell) => ({ ...cell })));
      next[last.row][last.col].val = last.prevVal;
      next[last.row][last.col].notes = last.prevNotes;
      next[last.row][last.col].isError = false;
      return next;
    });
    setSelectedCell([last.row, last.col]);
  };

  // Smart Hint
  const handleHint = () => {
    if (hintsRemaining <= 0 || !levelData || isPaused || isCompleted) return;
    const rawMatrix = grid.map((r) => r.map((c) => c.val));
    const hint = getSmartHint(rawMatrix, levelData.solution);

    if (hint) {
      setHintsRemaining((h) => h - 1);
      sound.playCorrect();
      setSelectedCell([hint.row, hint.col]);
      setHintMessage(lang === 'ar' ? hint.explanationAr : hint.explanationEn);

      // Auto-fill hinted cell
      setGrid((prev) => {
        const next = prev.map((rowArr) => rowArr.map((cell) => ({ ...cell })));
        next[hint.row][hint.col].val = hint.num;
        next[hint.row][hint.col].notes = [];
        next[hint.row][hint.col].isError = false;
        return next;
      });

      // Clear hint toast after 5s
      setTimeout(() => {
        setHintMessage(null);
      }, 5000);
    }
  };

  // Restart level
  const handleRestart = () => {
    if (!levelData) return;
    sound.playClick();
    const initialGrid = levelData.puzzle.map((row) =>
      row.map((val) => ({
        val,
        isClue: val !== 0,
        notes: [],
        isError: false,
      }))
    );
    setGrid(initialGrid);
    setHistory([]);
    setMistakes(0);
    setTimeSeconds(0);
    setIsPaused(false);
    setIsCompleted(false);
    setHintMessage(null);
  };

  // Format time
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setScreen('offline_levels');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.backToLevels}</span>
        </button>

        {/* Level & Difficulty badge */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
            {t.levelN} #{currentOfflineLevel}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {levelData ? t[levelData.difficulty as keyof typeof t] || levelData.difficulty : ''}
          </span>
        </div>

        {/* Pause & Restart buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRestart}
            title={t.restart}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsPaused((p) => !p);
            }}
            title={isPaused ? t.resume : t.pause}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Info Status Bar (Mistakes, Timer, Hints) */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>{t.mistakes}:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{mistakes}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-mono font-bold">{formatTime(timeSeconds)}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{t.hintsLeft}:</span>
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{hintsRemaining}</span>
        </div>
      </div>

      {/* Hint Message Toast */}
      {hintMessage && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 animate-fade-in">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{hintMessage}</span>
        </div>
      )}

      {/* Sudoku Board or Paused View */}
      <div className="relative">
        <SudokuBoard
          mode="offline"
          offlineGrid={grid}
          selectedRow={selectedCell ? selectedCell[0] : null}
          selectedCol={selectedCell ? selectedCell[1] : null}
          onSelectCell={handleSelectCell}
          highlightDuplicates={highlightDuplicates}
          highlightSameNumbers={highlightSameNumbers}
        />

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 rounded-2xl bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 z-20">
            <h3 className="text-xl font-bold">{t.pause}</h3>
            <button
              type="button"
              onClick={() => setIsPaused(false)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>{t.resume}</span>
            </button>
          </div>
        )}
      </div>

      {/* Keypad & Controls */}
      <Keypad
        onNumberInput={handleNumberInput}
        onErase={handleErase}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        notesMode={notesMode}
        onToggleNotes={() => setNotesMode((n) => !n)}
        onHint={handleHint}
        hintsRemaining={hintsRemaining}
        disabled={isPaused || isCompleted}
      />

      {/* Victory Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-indigo-500/40 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-500 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {t.victory}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.levelCompleted} #{currentOfflineLevel}
              </p>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2 my-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 ${
                    s <= earnedStars
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Stats summary */}
            <div className="w-full grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.time}</span>
                <div className="font-mono font-bold text-sm text-slate-800 dark:text-white">
                  {formatTime(timeSeconds)}
                </div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">{t.mistakes}</span>
                <div className="font-mono font-bold text-sm text-slate-800 dark:text-white">
                  {mistakes}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="w-full flex flex-col gap-2 mt-2">
              {currentOfflineLevel < 100 && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setCurrentOfflineLevel(currentOfflineLevel + 1);
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95"
                >
                  {t.nextLevel} #{currentOfflineLevel + 1}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setScreen('offline_levels');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {t.backToLevels}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
