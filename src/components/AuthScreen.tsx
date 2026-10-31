import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  LogIn,
  UserPlus,
  Sparkles,
  Languages,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

const AVATARS = [
  { id: 'user_1', color: 'from-indigo-500 to-purple-600', label: '1' },
  { id: 'user_2', color: 'from-emerald-500 to-teal-600', label: '2' },
  { id: 'user_3', color: 'from-amber-500 to-orange-600', label: '3' },
  { id: 'user_4', color: 'from-rose-500 to-pink-600', label: '4' },
  { id: 'user_5', color: 'from-cyan-500 to-blue-600', label: '5' },
  { id: 'user_6', color: 'from-violet-500 to-fuchsia-600', label: '6' },
  { id: 'user_7', color: 'from-lime-500 to-emerald-600', label: '7' },
  { id: 'user_8', color: 'from-sky-500 to-indigo-600', label: '8' },
];

export const AuthScreen: React.FC = () => {
  const {
    lang,
    setLang,
    theme,
    toggleTheme,
    isMuted,
    toggleSound,
    loginUser,
    registerUser,
    showToast,
    t,
  } = useGame();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState<string>('');
  const [emailOrUser, setEmailOrUser] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('user_1');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    sound.playClick();

    if (mode === 'login') {
      if (!emailOrUser.trim() || !password) {
        setErrorMessage(lang === 'ar' ? 'يرجى إدخال اسم المستخدم أو البريد وكلمة المرور' : 'Please enter your username/email and password');
        return;
      }
      setLoading(true);
      const res = await loginUser(emailOrUser.trim(), password);
      setLoading(false);
      if (res.success) {
        sound.playVictory();
        showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح! أهلاً بك' : 'Logged in successfully! Welcome');
      } else {
        sound.playWrong();
        setErrorMessage(res.error || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
      }
    } else {
      // Registration checks
      if (!username.trim() || username.trim().length < 3) {
        setErrorMessage(lang === 'ar' ? 'اسم المستخدم يجب ألا يقل عن 3 أحرف' : 'Username must be at least 3 characters');
        return;
      }
      if (password.length < 6) {
        setErrorMessage(t.passwordTooShort);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t.passwordsDoNotMatch);
        return;
      }

      setLoading(true);
      const res = await registerUser(
        username.trim(),
        email.trim() || undefined,
        password,
        selectedAvatar
      );
      setLoading(false);
      if (res.success) {
        sound.playVictory();
        showToast(lang === 'ar' ? 'تم إنشاء الحساب بنجاح! نتمنى لك تجربة ممتعة' : 'Account created successfully!');
      } else {
        sound.playWrong();
        setErrorMessage(res.error || (lang === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'));
      }
    }
  };

  // Google Sign-In with Firebase
  const handleGoogleSignIn = async () => {
    sound.playClick();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (isFirebaseConfigured) {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleUid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoUrl: fbUser.photoURL,
          }),
        });
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('sudoku_user_id', data.user.id);
          window.location.reload();
          return;
        }
      } else {
        // Direct simulation for local / dev without external firebase prompt
        const dummyEmail = `player_${Math.floor(1000 + Math.random() * 9000)}@google.com`;
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleUid: `goog_${Date.now()}`,
            email: dummyEmail,
            displayName: `Player_${Math.floor(100 + Math.random() * 900)}`,
          }),
        });
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('sudoku_user_id', data.user.id);
          window.location.reload();
          return;
        }
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 selection:bg-indigo-500 selection:text-white">
      {/* Top Header Controls (Language, Theme, Sound) */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
            9
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-100">
            {t.appTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title={isMuted ? t.soundOff : t.soundOn}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setLang(lang === 'ar' ? 'en' : 'ar');
            }}
            className="px-2.5 h-8 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-5">
        {/* Title & Badge */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.authRequired}</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' ? t.welcomeBack : t.createYourAccount}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {t.authSubtitle}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('login');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.login}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setMode('register');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.register}
          </button>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
                  {t.username}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم اللاعب (مثال: البطل_سودوكو)' : 'Player username'}
                    className="w-full ps-9 pe-3 py-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-start">
                  {t.avatarSelect}
                </label>
                <div className="grid grid-cols-8 gap-1.5">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedAvatar(av.id);
                      }}
                      className={`h-8 rounded-lg bg-gradient-to-tr ${av.color} text-white font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                        selectedAvatar === av.id
                          ? 'ring-2 ring-white scale-110 shadow-lg'
                          : 'opacity-50 hover:opacity-90'
                      }`}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
                  {t.email} ({lang === 'ar' ? 'اختياري' : 'optional'})
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'login' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
                {t.username} / {t.email}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="text"
                  required
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل اسم المستخدم أو البريد' : 'Username or email'}
                  className="w-full ps-9 pe-3 py-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Confirm Password (only on Register) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-9 pe-3 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>
              {loading
                ? lang === 'ar'
                  ? 'جارٍ التحقق...'
                  : 'Verifying...'
                : mode === 'login'
                ? t.login
                : t.register}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-[1px] bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase">{lang === 'ar' ? 'أو' : 'OR'}</span>
          <div className="flex-1 h-[1px] bg-slate-800" />
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2.5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{t.googleSignIn}</span>
        </button>

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.securityProtected}</span>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[11px] text-slate-600 py-2">
        Sudoku Master &copy; {new Date().getFullYear()} &middot; {lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </div>
    </div>
  );
};
