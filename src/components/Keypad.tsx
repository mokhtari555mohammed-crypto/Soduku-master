import React from 'react';
import { useGame } from '../context/GameContext';
import { RotateCcw, Delete, Pencil, Lightbulb } from 'lucide-react';
import { sound } from '../utils/sound';

interface KeypadProps {
  onNumberInput: (num: number) => void;
  onErase: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  notesMode?: boolean;
  onToggleNotes?: () => void;
  onHint?: () => void;
  hintsRemaining?: number;
  disabled?: boolean;
  isMultiplayer?: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  onNumberInput,
  onErase,
  onUndo,
  canUndo = false,
  notesMode = false,
  onToggleNotes,
  onHint,
  hintsRemaining = 3,
  disabled = false,
  isMultiplayer = false,
}) => {
  const { t } = useGame();

  const handleNum = (num: number) => {
    if (disabled) return;
    sound.playClick();
    onNumberInput(num);
  };

  return (
    <div className="w-full max-w-[440px] mx-auto flex flex-col gap-2 mt-2">
      {/* Action controls row (Undo, Erase, Notes, Hint) */}
      {!isMultiplayer && (
        <div className="grid grid-cols-4 gap-2 px-1">
          {/* Undo */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || disabled}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              canUndo && !disabled
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.undo}</span>
          </button>

          {/* Erase */}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              sound.playClick();
              onErase();
            }}
            disabled={disabled}
            className="h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
          >
            <Delete className="w-4 h-4" />
            <span>{t.erase}</span>
          </button>

          {/* Notes Toggle */}
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              sound.playClick();
              onToggleNotes?.();
            }}
            disabled={disabled}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              notesMode
                ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>{t.notes}</span>
          </button>

          {/* Hint */}
          <button
            type="button"
            onClick={() => {
              if (disabled || hintsRemaining <= 0) return;
              sound.playClick();
              onHint?.();
            }}
            disabled={disabled || hintsRemaining <= 0}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer ${
              hintsRemaining > 0 && !disabled
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:border-amber-800 dark:text-amber-300 active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{t.useHint}</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900/80 font-bold">
              {hintsRemaining}
            </span>
          </button>
        </div>
      )}

      {/* Number buttons 1-9 */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5 px-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            disabled={disabled}
            onClick={() => handleNum(num)}
            className={`h-12 sm:h-13 rounded-xl flex items-center justify-center font-mono text-xl sm:text-2xl font-bold shadow-sm transition-all border select-none ${
              disabled
                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                : 'bg-white hover:bg-indigo-50 border-slate-200 text-slate-900 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-white dark:hover:text-indigo-300 active:scale-95 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
