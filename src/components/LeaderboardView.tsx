import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { LeaderboardEntry } from '../types';
import {
  Trophy,
  Medal,
  ArrowLeft,
  ArrowRight,
  Flame,
  Award,
  Crown,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const LeaderboardView: React.FC = () => {
  const { lang, setScreen, user, t } = useGame();
  const [period, setPeriod] = useState<'all' | 'monthly' | 'weekly' | 'daily'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch((err) => console.error('Failed to load leaderboard', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [period]);

  const handlePeriodChange = (newPeriod: 'all' | 'monthly' | 'weekly' | 'daily') => {
    sound.playClick();
    setPeriod(newPeriod);
  };

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const top3 = leaderboard.slice(0, 3);
  const userRankIndex = leaderboard.findIndex((item) => item.userId === user?.id);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setScreen('home');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          <BackIcon className="w-4 h-4" />
          <span>{t.home}</span>
        </button>

        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>{t.globalLeaderboard}</span>
        </h2>

        <div className="w-16" />
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => handlePeriodChange('all')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            period === 'all'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.allTime}
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('monthly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            period === 'monthly'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.monthly}
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('weekly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            period === 'weekly'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.weekly}
        </button>
        <button
          type="button"
          onClick={() => handlePeriodChange('daily')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            period === 'daily'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.daily}
        </button>
      </div>

      {/* Top 3 Podium (if at least 1 player) */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3 items-end pt-6 pb-2 px-2">
          {/* 2nd Place */}
          {top3[1] ? (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-base text-slate-800 dark:text-white shadow-md">
                  {top3[1].username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center text-[10px] font-black border border-white">
                  2
                </div>
              </div>
              <div className="font-bold text-xs truncate max-w-[80px] sm:max-w-[120px] text-slate-900 dark:text-white">
                {top3[1].username}
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                {top3[1].wins} {t.wins}
              </div>
              <div className="w-full h-16 mt-2 rounded-t-xl bg-slate-200/60 dark:bg-slate-800/80 flex items-center justify-center font-black text-slate-400 text-xl">
                2
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* 1st Place (Champion) */}
          {top3[0] && (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <Crown className="w-6 h-6 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-amber-400/30">
                  {top3[0].username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                  1ST
                </div>
              </div>
              <div className="font-bold text-sm truncate max-w-[90px] sm:max-w-[140px] text-slate-900 dark:text-white">
                {top3[0].username}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-mono font-black">
                {top3[0].wins} {t.wins}
              </div>
              <div className="w-full h-24 mt-2 rounded-t-xl bg-gradient-to-t from-amber-500/20 to-amber-500/10 dark:from-amber-900/40 dark:to-amber-900/20 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-500 text-2xl">
                1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] ? (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full bg-amber-800/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-base shadow-md">
                  {top3[2].username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-2 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-black border border-white">
                  3
                </div>
              </div>
              <div className="font-bold text-xs truncate max-w-[80px] sm:max-w-[120px] text-slate-900 dark:text-white">
                {top3[2].username}
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                {top3[2].wins} {t.wins}
              </div>
              <div className="w-full h-12 mt-2 rounded-t-xl bg-amber-800/10 dark:bg-amber-950/40 flex items-center justify-center font-black text-amber-700 dark:text-amber-400 text-lg">
                3
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Your Rank Highlight Card */}
      {userRankIndex >= 0 && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-base">
              #{userRankIndex + 1}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {t.yourPosition}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono font-bold">
            <span>
              {leaderboard[userRankIndex].wins} {t.wins}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {leaderboard[userRankIndex].rating} {t.rating}
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {lang === 'ar' ? 'جارٍ تحميل التصنيف...' : 'Loading leaderboard...'}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {lang === 'ar' ? 'لا توجد نتائج مسجلة بعد في هذه الفترة.' : 'No matches recorded yet for this period.'}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="py-3 px-3 text-center w-12">{t.rankHeader}</th>
                  <th className="py-3 px-3 text-start">{t.playerHeader}</th>
                  <th className="py-3 px-3 text-center">{t.winsHeader}</th>
                  <th className="py-3 px-3 text-center">{t.matchesHeader}</th>
                  <th className="py-3 px-3 text-center">{t.winRateHeader}</th>
                  <th className="py-3 px-3 text-center">{t.rating}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((player, idx) => {
                  const isMe = player.userId === user?.id;
                  return (
                    <tr
                      key={player.userId}
                      className={`transition-colors ${
                        isMe
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/50 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {idx + 1 === 1 ? (
                          <span className="text-amber-500 font-black">1</span>
                        ) : idx + 1 === 2 ? (
                          <span className="text-slate-400 font-black">2</span>
                        ) : idx + 1 === 3 ? (
                          <span className="text-amber-700 font-black">3</span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {player.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[130px] sm:max-w-[180px] text-slate-900 dark:text-white">
                            {player.username}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {player.wins}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {player.matches}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                        {player.winRate}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {player.rating}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
