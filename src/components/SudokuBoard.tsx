import React from 'react';
import { MultiplayerCell } from '../types';
import { sound } from '../utils/sound';

interface OfflineCell {
  val: number;
  isClue: boolean;
  notes?: number[];
  isError?: boolean;
}

interface SudokuBoardProps {
  mode: 'offline' | 'multiplayer';
  // If offline
  offlineGrid?: OfflineCell[][];
  // If multiplayer
  multiplayerGrid?: MultiplayerCell[][];
  selectedRow: number | null;
  selectedCol: number | null;
  onSelectCell: (row: number, col: number) => void;
  highlightDuplicates?: boolean;
  highlightSameNumbers?: boolean;
  player1Id?: string;
  player2Id?: string;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  mode,
  offlineGrid,
  multiplayerGrid,
  selectedRow,
  selectedCol,
  onSelectCell,
  highlightDuplicates = true,
  highlightSameNumbers = true,
  player1Id,
  player2Id,
}) => {
  // Determine selected number to highlight same numbers
  let selectedNumber = 0;
  if (selectedRow !== null && selectedCol !== null) {
    if (mode === 'offline' && offlineGrid) {
      selectedNumber = offlineGrid[selectedRow]?.[selectedCol]?.val || 0;
    } else if (mode === 'multiplayer' && multiplayerGrid) {
      selectedNumber = multiplayerGrid[selectedRow]?.[selectedCol]?.val || 0;
    }
  }

  const handleCellClick = (r: number, c: number) => {
    sound.playClick();
    onSelectCell(r, c);
  };

  return (
    <div className="w-full max-w-[440px] aspect-square mx-auto p-1.5 sm:p-2.5 bg-slate-800 dark:bg-slate-950 rounded-2xl shadow-xl border-2 border-slate-700/80 dark:border-slate-800 select-none">
      <div className="w-full h-full grid grid-cols-9 grid-rows-9 gap-[1px] bg-slate-300 dark:bg-slate-700/80 rounded-xl overflow-hidden border border-slate-400 dark:border-slate-700">
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const isSelected = selectedRow === r && selectedCol === c;
            const inSameRow = selectedRow === r;
            const inSameCol = selectedCol === c;
            const inSameBox =
              selectedRow !== null &&
              selectedCol !== null &&
              Math.floor(selectedRow / 3) === Math.floor(r / 3) &&
              Math.floor(selectedCol / 3) === Math.floor(c / 3);

            // 3x3 block borders
            const isRightBorder = c % 3 === 2 && c !== 8;
            const isBottomBorder = r % 3 === 2 && r !== 8;

            let val = 0;
            let isClue = false;
            let isError = false;
            let isCorrectMulti = false;
            let isWrongMulti = false;
            let answeredByP1 = false;
            let answeredByP2 = false;
            let notes: number[] = [];

            if (mode === 'offline' && offlineGrid) {
              const cell = offlineGrid[r][c];
              val = cell.val;
              isClue = cell.isClue;
              isError = Boolean(cell.isError);
              notes = cell.notes || [];
            } else if (mode === 'multiplayer' && multiplayerGrid) {
              const cell = multiplayerGrid[r][c];
              val = cell.val;
              isClue = cell.isClue;
              isCorrectMulti = cell.isCorrect && !cell.isClue;
              isWrongMulti = !cell.isCorrect && !cell.isClue && cell.val !== 0;
              answeredByP1 = cell.answeredByPlayerId === player1Id;
              answeredByP2 = cell.answeredByPlayerId === player2Id;
            }

            const isSameNumber =
              highlightSameNumbers && selectedNumber > 0 && val === selectedNumber;

            // Background color logic
            let bgClasses = 'bg-white dark:bg-slate-900';
            if (isSelected) {
              bgClasses = 'bg-indigo-500 text-white font-bold dark:bg-indigo-600';
            } else if (isCorrectMulti) {
              bgClasses = answeredByP1
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold'
                : 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-bold';
            } else if (isWrongMulti) {
              bgClasses = 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-medium';
            } else if (isError && highlightDuplicates) {
              bgClasses = 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold';
            } else if (isSameNumber) {
              bgClasses = 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-200';
            } else if (inSameRow || inSameCol || inSameBox) {
              bgClasses = 'bg-slate-100 dark:bg-slate-800/60';
            }

            // Text color logic
            let textClasses = 'text-slate-800 dark:text-slate-100';
            if (isSelected) {
              textClasses = 'text-white';
            } else if (isClue) {
              textClasses = 'text-slate-950 dark:text-white font-black';
            } else if (!isCorrectMulti && !isWrongMulti && !isError) {
              textClasses = 'text-indigo-700 dark:text-indigo-400 font-bold';
            }

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`relative flex items-center justify-center text-lg sm:text-xl md:text-2xl font-mono transition-colors cursor-pointer select-none active:scale-95 ${bgClasses} ${
                  isRightBorder ? 'border-r-2 border-r-slate-800 dark:border-r-slate-400' : ''
                } ${
                  isBottomBorder ? 'border-b-2 border-b-slate-800 dark:border-b-slate-400' : ''
                }`}
              >
                {val !== 0 ? (
                  <span className={`${textClasses}`}>{val}</span>
                ) : notes.length > 0 ? (
                  // Pencil notes 3x3 micro-grid
                  <div className="w-full h-full p-0.5 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {Array.from({ length: 9 }).map((_, i) => {
                      const num = i + 1;
                      const has = notes.includes(num);
                      return (
                        <div
                          key={num}
                          className="flex items-center justify-center text-[8px] sm:text-[9px] font-mono leading-none text-slate-500 dark:text-slate-400"
                        >
                          {has ? num : ''}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Multiplayer owner tag indicator */}
                {isCorrectMulti && (
                  <div
                    className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                      answeredByP1 ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
