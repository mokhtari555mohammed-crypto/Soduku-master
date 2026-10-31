import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  User,
  Shield,
  Trophy,
  Flame,
  Target,
  Award,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Check,
  KeyRound,
  LogIn,
  UserPlus,
  LogOut,
} from 'lucide-react';
import { sound } from '../utils/sound';

const AVATAR_OPTIONS = [
  'user_1',
  'user_2',
  'user_3',
  'user_4',
  'user_5',
  'user_6',
  'user_7',
  'user_8',
];

const AVATAR_COLORS: Record<string, string> = {
  user_1: 'from-indigo-500 to-purple-600',
  user_2: 'from-emerald-500 to-teal-600',
  user_3: 'from-amber-500 to-orange-600',
  user_4: 'from-rose-500 to-pink-600',
  user_5: 'from-cyan-500 to-blue-600',
  user_6: 'from-violet-500 to-fuchsia-600',
  user_7: 'from-lime-500 to-emerald-600',
  user_8: 'from-sky-500 to-indigo-600',
};

export const ProfileView: React.FC = () => {
  const {
    lang,
    setScreen,
    user,
    profile,
    updateProfileData,
    loginUser,
    registerUser,
    logoutUser,
    offlineProgress,
    showToast,
    t,
  } = useGame();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(profile?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile?.avatar || 'user_1');
  const [saving, setSaving] = useState<boolean>(false);

  // Auth form modal state
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmailOrUser, setAuthEmailOrUser] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setSaving(true);
    const success = await updateProfileData(usernameInput.trim(), selectedAvatar);
    setSaving(false);
    if (success) {
      sound.playClick();
      setIsEditing(false);
      showToast(lang === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'login') {
      const res = await loginUser(authEmailOrUser.trim(), authPassword);
      if (res.success) {
        sound.playVictory();
        setShowAuthModal(false);
        showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
      } else {
        setAuthError(res.error || 'Login failed');
      }
    } else {
      const isEmail = authEmailOrUser.includes('@');
      const res = await registerUser(
        isEmail ? authEmailOrUser.split('@')[0] : authEmailOrUser.trim(),
        isEmail ? authEmailOrUser.trim() : undefined,
        authPassword,
        selectedAvatar
      );
      if (res.success) {
        sound.playVictory();
        setShowAuthModal(false);
        showToast(lang === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
      } else {
        setAuthError(res.error || 'Registration failed');
      }
    }
  };

  const completedCount = Object.keys(offlineProgress.levels || {}).length;
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
  const avatarGradient = AVATAR_COLORS[selectedAvatar] || 'from-indigo-500 to-purple-600';

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

        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-500" />
          <span>{t.profileTitle}</span>
        </h2>

        {user?.isGuest ? (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowAuthModal(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t.login}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={logoutUser}
            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.logout}</span>
          </button>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-start">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${avatarGradient} text-white font-black text-3xl flex items-center justify-center shadow-lg ring-4 ring-indigo-500/20`}
            >
              {(profile?.username || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {profile?.username}
              </h3>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {profile?.rankTitle || 'Novice'}
                </span>
                <span className="text-xs text-slate-400">
                  {user?.isGuest ? t.guestUser : t.registeredUser}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsEditing((e) => !e);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditing ? t.close : t.editProfile}</span>
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-4 animate-fade-in"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
                {t.username}
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                maxLength={20}
                required
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 text-start">
                {t.avatarSelect}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`h-10 rounded-xl bg-gradient-to-tr ${
                      AVATAR_COLORS[av]
                    } text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer ${
                      selectedAvatar === av
                        ? 'ring-4 ring-indigo-500 scale-105 shadow-md'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {av.replace('user_', '')}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveProfile}</span>
            </button>
          </form>
        )}

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.rating}</span>
            <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {profile?.rating}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.matchesPlayed}</span>
            <div className="text-xl font-black font-mono text-slate-800 dark:text-white">
              {profile?.matches}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.wins}</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {profile?.wins}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.winRate}</span>
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {profile?.winRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.losses}</span>
            <div className="text-xl font-black font-mono text-rose-500">
              {profile?.losses}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.bestStreak}</span>
            <div className="text-xl font-black font-mono text-orange-500">
              {profile?.bestStreak}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.correctSolves}</span>
            <div className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">
              {profile?.correctMoves}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-start">
            <span className="text-[10px] text-slate-500 font-medium">{t.completedLevels}</span>
            <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">
              {completedCount}/100
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-indigo-500/40 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {authMode === 'login' ? t.login : t.register}
              </h3>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-start">
                  {t.username} / {t.email}
                </label>
                <input
                  type="text"
                  value={authEmailOrUser}
                  onChange={(e) => setAuthEmailOrUser(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-start">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {authMode === 'login' ? t.login : t.register}
              </button>
            </form>

            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                {authMode === 'login' ? t.dontHaveAccount : t.alreadyHaveAccount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
