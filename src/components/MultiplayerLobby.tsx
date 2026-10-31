import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Users,
  Search,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Zap,
  Radio,
  Loader2,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const MultiplayerLobby: React.FC = () => {
  const {
    lang,
    setScreen,
    findRandomMatch,
    cancelMatchmaking,
    matchmakingState,
    createPrivateRoom,
    joinPrivateRoom,
    currentRoom,
    leaveMultiplayer,
    user,
    wsConnected,
    showToast,
    t,
  } = useGame();

  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    sound.playClick();
    setCopied(true);
    showToast(t.codeCopied);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    joinPrivateRoom(inputCode.trim());
  };

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
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

        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {wsConnected
              ? lang === 'ar'
                ? 'متصل بالشبكة الحية'
                : 'Connected'
              : lang === 'ar'
              ? 'جارٍ الاتصال...'
              : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Hero Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <Radio className="w-3.5 h-3.5" />
          <span>{t.multiplayerTitle}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {lang === 'ar' ? 'تحدَّ أصدقاءك أو نافس العالم' : 'Challenge Friends or the World'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {t.multiplayerDesc}
        </p>
      </div>

      {/* Matchmaking / Room State Modals or Cards */}
      {matchmakingState === 'searching' ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-xl flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-indigo-600 animate-spin flex items-center justify-center" />
            <Search className="w-8 h-8 text-indigo-600 dark:text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.searchingPlayer}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'يتم البحث عن لاعب في نفس المستوى للمواجهة...'
                : 'Matching you with an online player...'}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelMatchmaking}
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {t.cancelSearch}
          </button>
        </div>
      ) : currentRoom ? (
        /* Private Room Created / Waiting for Friend */
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-xl flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {t.shareRoomCode}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.waitingForOpponent}
            </p>
          </div>

          {/* 6-Character Code Display */}
          <div className="flex items-center gap-3 p-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-indigo-600 dark:text-indigo-400">
              {currentRoom.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm transition-all cursor-pointer"
              title={t.copyCode}
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>{t.waitingForOpponent}</span>
          </div>

          <button
            type="button"
            onClick={leaveMultiplayer}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
          >
            {t.leaveRoom}
          </button>
        </div>
      ) : (
        /* Standard Lobby Options: Matchmaking & Custom Rooms */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Matchmaking Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5 text-start">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.randomMatch}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'انضم تلقائياً لمباراة مع أي لاعب متصل حالياً حول العالم وتنافس في حل الشبكة.'
                  : 'Automatically pair up with any available online player for a fast-paced duel.'}
              </p>
            </div>

            <button
              type="button"
              onClick={findRandomMatch}
              disabled={!wsConnected}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{t.randomMatch}</span>
            </button>
          </div>

          {/* Private Room Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-5 text-start">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'ar' ? 'غرفة خاصة مع صديق' : 'Private Room'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'أنشئ غرفة واحصل على رمز مكون من 6 أحرف أو أدخل رمز صديقك للانضمام فوراً.'
                  : 'Create a room to get a 6-letter code or enter a friend’s code to join immediately.'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={createPrivateRoom}
                disabled={!wsConnected}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.createRoom}</span>
              </button>

              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder={lang === 'ar' ? 'رمز الغرفة (SD8921)' : 'Room Code'}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!wsConnected || !inputCode.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Rules Explainer Accordion */}
      <div className="p-5 rounded-3xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-start">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t.rulesTitle}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule1}
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule2}
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule3}
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule4}
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule5}
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            {t.rule6}
          </div>
        </div>
      </div>
    </div>
  );
};
