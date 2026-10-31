import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { SudokuBoard } from './SudokuBoard';
import { Keypad } from './Keypad';
import {
  Trophy,
  Clock,
  LogOut,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/sound';

export const MultiplayerGame: React.FC = () => {
  const {
    lang,
    user,
    currentMatch,
    sendGameMove,
    leaveMultiplayer,
    findRandomMatch,
    highlightSameNumbers,
    t,
  } = useGame();

  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(35);

  // Turn timer countdown
  useEffect(() => {
    if (!currentMatch || currentMatch.status !== 'playing') return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentMatch.turnStartedAt) / 1000);
      const remaining = Math.max(0, currentMatch.turnTimeoutSeconds - elapsed);
      setTurnSecondsLeft(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [currentMatch]);

  // Victory fireworks if user won
  useEffect(() => {
    if (currentMatch && currentMatch.status === 'finished') {
      if (currentMatch.winnerId === user?.id) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    }
  }, [currentMatch, user?.id]);

  if (!currentMatch) {
    return null;
  }

  const isMyTurn = currentMatch.currentTurnPlayerId === user?.id;
  const isPlayer1 = currentMatch.player1.id === user?.id;
  const myPlayer = isPlayer1 ? currentMatch.player1 : currentMatch.player2;
  const opponentPlayer = isPlayer1 ? currentMatch.player2 : currentMatch.player1;

  const handleSelectCell = (row: number, col: number) => {
    if (!isMyTurn || currentMatch.status !== 'playing') return;
    const cell = currentMatch.gridState[row][col];
    // Cannot select original clues or already correct cells
    if (cell.isClue || cell.isCorrect) {
      sound.playWrong();
      return;
    }
    setSelectedCell([row, col]);
  };

  const handleNumberInput = (num: number) => {
    if (!isMyTurn || !selectedCell || currentMatch.status !== 'playing') return;
    const [r, c] = selectedCell;
    sendGameMove(r, c, num);
  };

  const blanksRemaining = currentMatch.totalBlanks - currentMatch.filledBlanks;

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-4 sm:py-6 flex flex-col gap-4">
      {/* Match Header: Players & Scores */}
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        {/* My Player Card */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {myPlayer.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 text-start">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {myPlayer.username} ({lang === 'ar' ? 'أنت' : 'You'})
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500">{t.playerScore}:</span>
              <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                {myPlayer.score}
              </span>
            </div>
          </div>
        </div>

        {/* VS / Turn Timer Center */}
        <div className="flex flex-col items-center justify-center shrink-0 px-2">
          <div
            className={`flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-full ${
              turnSecondsLeft <= 10
                ? 'bg-rose-100 text-rose-600 animate-pulse'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{turnSecondsLeft}s</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">VS</span>
        </div>

        {/* Opponent Card */}
        <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-end">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {opponentPlayer.username}
            </div>
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] text-slate-500">{t.playerScore}:</span>
              <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                {opponentPlayer.score}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {opponentPlayer.username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Dynamic Turn Banner */}
      <div
        className={`w-full py-2 px-4 rounded-2xl text-center text-xs font-bold transition-all shadow-sm flex items-center justify-between ${
          isMyTurn
            ? 'bg-indigo-600 text-white animate-pulse-slow'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isMyTurn ? 'bg-amber-300 animate-ping' : 'bg-slate-400'
            }`}
          />
          <span>{isMyTurn ? t.yourTurn : t.opponentTurn}</span>
        </span>

        <span className="text-[10px] font-mono opacity-80">
          {blanksRemaining} {lang === 'ar' ? 'خانة متبقية' : 'cells left'}
        </span>
      </div>

      {/* Shared Sudoku Board */}
      <SudokuBoard
        mode="multiplayer"
        multiplayerGrid={currentMatch.gridState}
        selectedRow={selectedCell ? selectedCell[0] : null}
        selectedCol={selectedCell ? selectedCell[1] : null}
        onSelectCell={handleSelectCell}
        highlightSameNumbers={highlightSameNumbers}
        player1Id={currentMatch.player1.id}
        player2Id={currentMatch.player2.id}
      />

      {/* Keypad for Active Player */}
      <Keypad
        onNumberInput={handleNumberInput}
        onErase={() => {}}
        disabled={!isMyTurn || currentMatch.status !== 'playing' || !selectedCell}
        isMultiplayer={true}
      />

      {/* Leave Game Button */}
      <div className="flex justify-center mt-1">
        <button
          type="button"
          onClick={() => {
            if (confirm(lang === 'ar' ? 'هل أنت متأكد من مغادرة المباراة؟ سيتم احتساب الخسارة.' : 'Are you sure you want to forfeit and leave the match?')) {
              leaveMultiplayer();
            }
          }}
          className="text-xs text-slate-400 hover:text-rose-500 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.leaveRoom}</span>
        </button>
      </div>

      {/* Match Finished / Game Over Modal */}
      {currentMatch.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-indigo-500/40 shadow-2xl text-center flex flex-col items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${
                currentMatch.winnerId === user?.id
                  ? 'bg-amber-100 text-amber-500 dark:bg-amber-950 dark:text-amber-400'
                  : currentMatch.isDraw
                  ? 'bg-indigo-100 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400'
                  : 'bg-rose-100 text-rose-500 dark:bg-rose-950 dark:text-rose-400'
              }`}
            >
              {currentMatch.winnerId === user?.id ? (
                <Trophy className="w-8 h-8" />
              ) : currentMatch.isDraw ? (
                <Sparkles className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {currentMatch.winnerId === user?.id
                  ? t.youWon
                  : currentMatch.isDraw
                  ? t.matchDraw
                  : t.youLost}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'انتهت جميع خانات اللغز' : 'All cells have been completed'}
              </p>
            </div>

            {/* Score Comparison */}
            <div className="w-full grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-center">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {myPlayer.username} ({lang === 'ar' ? 'أنت' : 'You'})
                </div>
                <div className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {myPlayer.score}
                </div>
              </div>
              <div className="border-s border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {opponentPlayer.username}
                </div>
                <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {opponentPlayer.score}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  findRandomMatch();
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.rematch}</span>
              </button>
              <button
                type="button"
                onClick={leaveMultiplayer}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {t.backToLobby}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
