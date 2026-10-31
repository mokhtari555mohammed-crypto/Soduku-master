import React from 'react';
import { useGame } from '../context/GameContext';
import {
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Languages,
  Home,
  User as UserIcon,
  Trophy,
  Settings,
  LogOut,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const Header: React.FC = () => {
  const {
    lang,
    setLang,
    theme,
    toggleTheme,
    isMuted,
    toggleSound,
    screen,
    setScreen,
    profile,
    logoutUser,
    t,
  } = useGame();

  const handleNav = (target: any) => {
    sound.playClick();
    setScreen(target);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors bg-white/80 border-slate-200/80 dark:bg-slate-900/85 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo & Brand */}
        <button
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 group cursor-pointer text-start"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            9
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'ar' ? 'أوفلاين & أونلاين' : 'Online & Offline'}
            </p>
          </div>
        </button>

        {/* Center / Navigation Quick Links on desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => handleNav('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              screen === 'home'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.home}</span>
          </button>
          <button
            onClick={() => handleNav('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              screen === 'leaderboard'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>{t.leaderboard}</span>
          </button>
          <button
            onClick={() => handleNav('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              screen === 'profile'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{t.profile}</span>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5">
          {/* User mini badge */}
          {profile && (
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
              title={t.profile}
            >
              <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline max-w-[80px] truncate">{profile.username}</span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {profile.rating}
              </span>
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            aria-label={isMuted ? t.soundOff : t.soundOn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setLang(lang === 'ar' ? 'en' : 'ar');
            }}
            className="px-2 h-8 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Settings modal trigger */}
          <button
            onClick={() => handleNav('settings')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={t.settings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              sound.playClick();
              logoutUser();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title={t.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
