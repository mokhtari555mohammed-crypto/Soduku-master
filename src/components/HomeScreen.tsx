import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Gamepad2,
  Users,
  Trophy,
  User,
  Settings,
  Sparkles,
  Flame,
  Target,
  ArrowRight,
  ArrowLeft,
  Award,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const HomeScreen: React.FC = () => {
  const { lang, setScreen, profile, offlineProgress, t } = useGame();

  const handleNav = (screenName: any) => {
    sound.playClick();
    setScreen(screenName);
  };

  // Compute offline level completion count
  const completedCount = Object.keys(offlineProgress.levels || {}).length;
  const progressPercent = Math.min(100, Math.round((completedCount / 100) * 100));
  const Arrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-start">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold text-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ar' ? 'النسخة الاحترافية 2.0' : 'Pro Edition 2.0'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              {t.appSubtitle}
            </p>
          </div>

          {/* Quick Player Mini Card */}
          {profile && (
            <div className="w-full sm:w-auto min-w-[210px] bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white text-indigo-900 font-extrabold flex items-center justify-center text-lg shadow-inner">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="text-start">
                  <div className="font-bold text-sm truncate max-w-[120px]">
                    {profile.username}
                  </div>
                  <div className="text-xs text-indigo-200">
                    {profile.rankTitle || 'Novice'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                <div>
                  <div className="text-[10px] text-indigo-200">{t.rating}</div>
                  <div className="font-mono font-bold text-sm">{profile.rating}</div>
                </div>
                <div>
                  <div className="text-[10px] text-indigo-200">{t.winRate}</div>
                  <div className="font-mono font-bold text-sm">{profile.winRate}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Stats Quick Ribbon */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div className="text-start">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t.matchesPlayed}
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {profile.matches}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-start">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t.wins}
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {profile.wins}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div className="text-start">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t.bestStreak}
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {profile.bestStreak}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-start">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t.completedLevels}
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {completedCount}/100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Mode Choices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Offline Mode 100 Levels Card */}
        <div
          onClick={() => handleNav('offline_levels')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-start"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
              {completedCount} / 100
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {t.playOffline}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {lang === 'ar'
              ? 'تحدَّ عقلك عبر 100 مستوى حقيقي متدرج الصعوبة، من السهل جداً إلى التعجيزي، مع حفظ تلقائي ومضمونة الحل.'
              : 'Challenge your mind across 100 handcrafted progressive levels from Very Easy to Fiendish Master with auto-save.'}
          </p>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>{t.levelProgress}</span>
              <span className="font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
            <span>{t.startLevel}</span>
            <Arrow className="w-4 h-4" />
          </div>
        </div>

        {/* Online Multiplayer Card */}
        <div
          onClick={() => handleNav('multiplayer_lobby')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 p-6 shadow-sm hover:shadow-xl transition-all duration-300 text-start"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 animate-pulse">
              LIVE
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {t.playOnline}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
            {lang === 'ar'
              ? 'تنافس في الوقت الحقيقي بالتناوب على شبكة سودوكو واحدة! أنشئ غرفة خاصة برمز أو ابحث عن لاعب عشوائي.'
              : 'Compete in real time turn-by-turn on a single shared board! Create private rooms with a code or matchmaking.'}
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            {lang === 'ar'
              ? '⚡ نظام الأدوار التنافسي: إجابة صحيحة = +1 نقطة، إجابة خاطئة = انتقال الدور!'
              : '⚡ Competitive Rule: Correct = +1 score & lock, Wrong = turn passes!'}
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
            <span>{lang === 'ar' ? 'دخول اللوبي والتحدي' : 'Enter Multiplayer Lobby'}</span>
            <Arrow className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Secondary Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Leaderboard button */}
        <button
          type="button"
          onClick={() => handleNav('leaderboard')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm flex items-center gap-3.5 transition-all text-start cursor-pointer hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {t.leaderboard}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'الترتيب اليومي والعالمي' : 'Daily & Global ranks'}
            </div>
          </div>
        </button>

        {/* Profile button */}
        <button
          type="button"
          onClick={() => handleNav('profile')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm flex items-center gap-3.5 transition-all text-start cursor-pointer hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {t.profile}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'بياناتك وسجل المباريات' : 'Stats & avatars'}
            </div>
          </div>
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => handleNav('settings')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm flex items-center gap-3.5 transition-all text-start cursor-pointer hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {t.settings}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'القواعد والمظهر واللغة' : 'Rules, themes, sound'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
