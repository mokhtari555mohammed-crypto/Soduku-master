import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Star,
  CheckCircle2,
  Clock,
  Play,
  Flame,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const LevelSelect: React.FC = () => {
  const {
    lang,
    setScreen,
    offlineProgress,
    setCurrentOfflineLevel,
    t,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'all' | 'easy' | 'medium' | 'hard' | 'expert'>('all');

  const unlocked = offlineProgress.unlockedLevel || 1;
  const completedLevels = offlineProgress.levels || {};
  const completedCount = Object.keys(completedLevels).length;

  const handleSelectLevel = (levelNum: number) => {
    if (levelNum > unlocked) {
      sound.playWrong();
      return;
    }
    sound.playClick();
    setCurrentOfflineLevel(levelNum);
    setScreen('offline_game');
  };

  const getFilteredLevels = () => {
    const all = Array.from({ length: 100 }, (_, i) => i + 1);
    switch (activeTab) {
      case 'easy':
        return all.slice(0, 20);
      case 'medium':
        return all.slice(20, 50);
      case 'hard':
        return all.slice(50, 80);
      case 'expert':
        return all.slice(80, 100);
      default:
        return all;
    }
  };

  const getDifficultyLabel = (lvl: number) => {
    if (lvl === 1) return t.veryEasy;
    if (lvl <= 20) return t.easy;
    if (lvl <= 50) return t.medium;
    if (lvl <= 80) return t.hard;
    return t.expert;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Top Bar */}
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
          <span>{t.back}</span>
        </button>

        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            {t.selectLevel}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {completedCount} / 100 {t.levelCompleted}
          </p>
        </div>

        {/* Quick resume latest unlocked */}
        <button
          type="button"
          onClick={() => handleSelectLevel(Math.min(100, unlocked))}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">{t.continueLevel}</span>
          <span className="font-mono">#{Math.min(100, unlocked)}</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setActiveTab('all');
          }}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.allLevels} (100)
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setActiveTab('easy');
          }}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'easy'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.easy} (1-20)
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setActiveTab('medium');
          }}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'medium'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.medium} (21-50)
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setActiveTab('hard');
          }}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'hard'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {t.hard} (51-80)
        </button>
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            setActiveTab('expert');
          }}
          className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'expert'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-rose-500" />
            <span>{t.expert}</span>
          </span>
        </button>
      </div>

      {/* 100 Levels Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
        {getFilteredLevels().map((lvl) => {
          const isUnlocked = lvl <= unlocked;
          const isCompleted = Boolean(completedLevels[lvl]);
          const stars = completedLevels[lvl]?.stars || 0;
          const time = completedLevels[lvl]?.timeSeconds || 0;
          const isCurrent = lvl === unlocked;

          let cardStyle =
            'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed';

          if (isCompleted) {
            cardStyle =
              'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 hover:shadow-md cursor-pointer';
          } else if (isCurrent) {
            cardStyle =
              'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/30 shadow-md cursor-pointer animate-pulse-slow';
          } else if (isUnlocked) {
            cardStyle =
              'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-500 cursor-pointer shadow-sm hover:shadow-md';
          }

          return (
            <button
              key={lvl}
              type="button"
              disabled={!isUnlocked}
              onClick={() => handleSelectLevel(lvl)}
              className={`relative p-2 rounded-2xl border-2 flex flex-col items-center justify-between min-h-[85px] transition-all select-none active:scale-95 ${cardStyle}`}
            >
              {/* Level Number */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  #{lvl}
                </span>
                {!isUnlocked ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : null}
              </div>

              {/* Center status: Stars or Lock */}
              <div className="my-1">
                {isCompleted ? (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= stars
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                ) : isUnlocked ? (
                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                    {getDifficultyLabel(lvl)}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">{t.locked}</span>
                )}
              </div>

              {/* Bottom: Best Time or Empty */}
              <div className="w-full flex items-center justify-center text-[9px] font-mono text-slate-500 dark:text-slate-400">
                {isCompleted && time > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTime(time)}</span>
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
