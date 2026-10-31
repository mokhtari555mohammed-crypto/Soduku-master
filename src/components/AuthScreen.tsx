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
  HelpCircle,
  Copy,
  Check,
  Info,
  Wand2,
} from 'lucide-react';
import { sound } from '../utils/sound';

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

interface DiagnosticError {
  message: string;
  suggestion?: string;
  code?: string;
  field?: string;
}

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
    loginWithGoogle,
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
  const [diagnostic, setDiagnostic] = useState<DiagnosticError | null>(null);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('dmohamede555@gmail.com');

  // Switch tabs and reset errors
  const handleTabSwitch = (newMode: 'login' | 'register') => {
    sound.playClick();
    setMode(newMode);
    setDiagnostic(null);
  };

  // Copy error diagnosis to clipboard for friends or debugging
  const handleCopyDiagnostics = async () => {
    if (!diagnostic) return;
    sound.playClick();
    const reportText = `[Sudoku Master Auth Diagnostic Report]
Operation: ${mode.toUpperCase()}
Issue: ${diagnostic.message}
Proposed Solution: ${diagnostic.suggestion || 'N/A'}
Error Code: ${diagnostic.code || 'UNKNOWN'}
Target Field: ${diagnostic.field || 'N/A'}
User Input: ${mode === 'login' ? `Identifier: ${emailOrUser}` : `Username: ${username}, Email: ${email || 'none'}`}
Language: ${lang}
Timestamp: ${new Date().toISOString()}
UserAgent: ${navigator.userAgent}`;

    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedDiag(true);
      showToast(lang === 'ar' ? 'تم نسخ تقرير تشخيص الخطأ بنجاح!' : 'Diagnostic report copied!');
      setTimeout(() => setCopiedDiag(false), 3000);
    } catch {
      showToast(lang === 'ar' ? 'تعذر النسخ تلقائياً' : 'Could not copy text');
    }
  };

  // Generate suggested alternate username when taken
  const applySuggestedUsername = () => {
    sound.playClick();
    const clean = username.trim() || 'Player';
    const suggested = `${clean}_${Math.floor(10 + Math.random() * 90)}`;
    setUsername(suggested);
    setDiagnostic(null);
    showToast(lang === 'ar' ? `تم اعتماد الاسم المقترح: ${suggested}` : `Applied suggested: ${suggested}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiagnostic(null);
    sound.playClick();

    if (mode === 'login') {
      const cleanId = emailOrUser.trim();
      if (!cleanId) {
        setDiagnostic({
          message: lang === 'ar' ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني' : 'Please enter your username or email',
          suggestion: lang === 'ar' ? 'أدخل اسم الحساب أو البريد الذي قمت بالتسجيل به' : 'Enter your registered credentials',
          field: 'identifier',
          code: 'CLIENT_MISSING_ID',
        });
        return;
      }
      if (!password) {
        setDiagnostic({
          message: lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password',
          suggestion: lang === 'ar' ? 'أدخل كلمة المرور الخاصة بحسابك للمتابعة' : 'Enter your account password',
          field: 'password',
          code: 'CLIENT_MISSING_PASS',
        });
        return;
      }

      setLoading(true);
      const res = await loginUser(cleanId, password);
      setLoading(false);

      if (res.success) {
        sound.playVictory();
        showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح! أهلاً بك' : 'Logged in successfully! Welcome');
      } else {
        sound.playWrong();
        setDiagnostic({
          message: res.error || (lang === 'ar' ? 'فشل تسجيل الدخول، يرجى التأكد من البيانات' : 'Login failed, please check your credentials'),
          suggestion: res.suggestion || (lang === 'ar' ? 'تأكد من صحة اسم المستخدم وكلمة المرور أو أنشئ حساباً جديداً' : 'Check username and password, or create a new account'),
          code: res.code || 'LOGIN_ERROR',
          field: res.field,
        });
      }
    } else {
      // Registration checks
      const cleanUser = username.trim();
      if (!cleanUser || cleanUser.length < 2) {
        setDiagnostic({
          message: lang === 'ar' ? 'اسم المستخدم قصير جداً؛ يجب أن يتكون من حرفين على الأقل' : 'Username must be at least 2 characters',
          suggestion: lang === 'ar' ? 'اختر اسماً مميزاً يتكون من حرفين أو أكثر (مثال: بطل_السودوكو)' : 'Choose a username with at least 2 characters',
          field: 'username',
          code: 'CLIENT_SHORT_USER',
        });
        return;
      }

      if (password.length < 6) {
        setDiagnostic({
          message: lang === 'ar' ? `كلمة المرور يجب أن تتكون من 6 خانات على الأقل (أدخلت ${password.length} خانات فقط)` : `Password must be at least 6 characters (you entered ${password.length})`,
          suggestion: lang === 'ar' ? 'اختر كلمة مرور مكونة من 6 أحرف أو أرقام على الأقل لتأمين حسابك' : 'Choose a password with 6 or more characters',
          field: 'password',
          code: 'CLIENT_SHORT_PASS',
        });
        return;
      }

      if (password !== confirmPassword) {
        setDiagnostic({
          message: t.passwordsDoNotMatch,
          suggestion: lang === 'ar' ? 'تأكد من كتابة نفس كلمة المرور في خانة "تأكيد كلمة المرور"' : 'Make sure both password fields match exactly',
          field: 'confirmPassword',
          code: 'CLIENT_PASS_MISMATCH',
        });
        return;
      }

      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setDiagnostic({
            message: lang === 'ar' ? `صيغة البريد الإلكتروني "${email.trim()}" غير صحيحة` : `Invalid email address format: "${email.trim()}"`,
            suggestion: lang === 'ar' ? 'تأكد من كتابة بريد صالح مثل name@example.com أو اترك الحقل فارغاً (اختياري)' : 'Enter a valid email or leave blank (optional)',
            field: 'email',
            code: 'CLIENT_INVALID_EMAIL',
          });
          return;
        }
      }

      setLoading(true);
      const res = await registerUser(
        cleanUser,
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
        setDiagnostic({
          message: res.error || (lang === 'ar' ? 'تعذر إنشاء الحساب، يرجى المحاولة مجدداً' : 'Registration failed'),
          suggestion: res.suggestion || (lang === 'ar' ? 'تأكد من اختيار اسم غير مستخدم مسبقاً والتأكد من البيانات' : 'Ensure username is unique and credentials are valid'),
          code: res.code || 'REGISTER_ERROR',
          field: res.field,
        });
      }
    }
  };

  // Google Sign-In with Firebase & Seamless Fallback
  const handleGoogleSignIn = async (chosenEmail?: string) => {
    sound.playClick();
    setDiagnostic(null);
    setLoading(true);

    try {
      const emailToUse = (chosenEmail || googleEmailInput || 'dmohamede555@gmail.com').trim();
      const displayNameToUse = emailToUse.split('@')[0];

      const res = await loginWithGoogle(emailToUse, displayNameToUse, 'user_1');
      if (res.success) {
        sound.playVictory();
        setShowGoogleModal(false);
        showToast(lang === 'ar' ? 'تم تسجيل الدخول بحساب Google بنجاح!' : 'Logged in with Google successfully!');
      } else {
        sound.playWrong();
        setDiagnostic({
          message: res.error || (lang === 'ar' ? 'تعذر تسجيل الدخول بحساب Google' : 'Google login failed'),
          suggestion: res.suggestion || (lang === 'ar' ? 'يرجى التأكد من اتصال الإنترنت أو استخدام تسجيل الدخول بالاسم' : 'Check connection or login with username'),
          code: res.code || 'GOOGLE_AUTH_ERROR',
        });
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      sound.playWrong();
      setDiagnostic({
        message: err.message || (lang === 'ar' ? 'فشل تسجيل الدخول بحساب Google' : 'Google Sign-In failed'),
        suggestion: lang === 'ar' ? 'تأكد من اتصال الإنترنت وحاول مجدداً' : 'Check connection and try again',
        code: 'GOOGLE_EXCEPTION',
      });
    } finally {
      setLoading(false);
    }
  };

  // Realtime checks for register
  const isUsernameValid = username.trim().length >= 2;
  const isPasswordLongEnough = password.length >= 6;
  const isPasswordMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isEmailFormatValid = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-x-hidden">
      {/* Background ambient decorative glow */}
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/4 start-1/4 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 end-1/4 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl" />
      </div>

      {/* Top Bar with Branding & Settings */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between z-10 py-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/25">
            S
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wide bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              {t.appTitle}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              {lang === 'ar' ? 'نظام الحسابات الآمن' : 'Secure Player Accounts'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title={isMuted ? t.soundOff : t.soundOn}
            type="button"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            title={theme === 'dark' ? t.themeLight : t.themeDark}
            type="button"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setLang(lang === 'ar' ? 'en' : 'ar');
            }}
            className="px-2.5 h-8 rounded-lg flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
            type="button"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-md flex flex-col gap-4 z-10">
        {/* Title & Badge */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.authRequired}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
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
            onClick={() => handleTabSwitch('login')}
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
            onClick={() => handleTabSwitch('register')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.register}
          </button>
        </div>

        {/* Dedicated Diagnostic Feedback Banner (سبب المشكلة وحلها وتفاصيلها) */}
        {diagnostic && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2 animate-fade-in shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-extrabold text-white text-xs leading-snug">
                    {diagnostic.message}
                  </div>
                  {diagnostic.suggestion && (
                    <div className="text-[11px] text-amber-300 flex items-start gap-1 font-medium mt-1">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                      <span>{diagnostic.suggestion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions based on error type */}
            <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-[11px] gap-2 flex-wrap">
              {diagnostic.code && (
                <div className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800 text-[10px] font-mono text-rose-300">
                  {lang === 'ar' ? 'الرمز:' : 'Code:'} {diagnostic.code}
                </div>
              )}

              <div className="flex items-center gap-1.5 ms-auto">
                {diagnostic.code === 'USERNAME_ALREADY_EXISTS' && mode === 'register' && (
                  <button
                    type="button"
                    onClick={applySuggestedUsername}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'استخدم اسماً مقترحاً' : 'Apply suggestion'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyDiagnostics}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title={lang === 'ar' ? 'نسخ تفاصيل المشكلة لإرسالها للدعم أو الأصدقاء' : 'Copy diagnostic details'}
                >
                  {copiedDiag ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">{lang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'نسخ تفاصيل الخطأ' : 'Copy details'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              {/* Username Input with live validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300 text-start">
                    {t.username}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {username.trim().length}/25
                  </span>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (diagnostic?.field === 'username') setDiagnostic(null);
                    }}
                    placeholder={lang === 'ar' ? 'اسم اللاعب (مثال: البطل_سودوكو)' : 'Player username'}
                    className={`w-full ps-9 pe-8 py-2.5 text-xs font-bold rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                      diagnostic?.field === 'username'
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                        : isUsernameValid
                        ? 'border-emerald-600/70 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {isUsernameValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-1/2 -translate-y-1/2 end-2.5" />
                  )}
                </div>
                {/* Field feedback hint */}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <Info className="w-3 h-3 text-slate-500" />
                  <span>
                    {lang === 'ar'
                      ? 'يجب ألا يقل عن حرفين، ويمكن استخدام الحروف والأرقام والشرطة السفلية'
                      : 'Must be 2+ characters, letters, numbers & underscores allowed'}
                  </span>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 text-start">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300 text-start">
                    {t.email} ({lang === 'ar' ? 'اختياري' : 'optional'})
                  </label>
                  <span className="text-[10px] text-indigo-400">
                    {lang === 'ar' ? 'لحفظ السحاب واستعادة الحساب' : 'For cloud backup'}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (diagnostic?.field === 'email') setDiagnostic(null);
                    }}
                    placeholder="player@example.com"
                    className={`w-full ps-9 pe-8 py-2.5 text-xs rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                      diagnostic?.field === 'email'
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                        : email.trim() && isEmailFormatValid
                        ? 'border-emerald-600/70 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {email.trim() && isEmailFormatValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-1/2 -translate-y-1/2 end-2.5" />
                  )}
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
                  onChange={(e) => {
                    setEmailOrUser(e.target.value);
                    if (diagnostic?.field === 'identifier') setDiagnostic(null);
                  }}
                  placeholder={lang === 'ar' ? 'أدخل اسم المستخدم أو البريد المسجل' : 'Username or registered email'}
                  className={`w-full ps-9 pe-3 py-2.5 text-xs font-bold rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                    diagnostic?.field === 'identifier'
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Password with live indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300 text-start">
                {t.password}
              </label>
              {mode === 'register' && (
                <span
                  className={`text-[10px] font-bold ${
                    password.length === 0
                      ? 'text-slate-500'
                      : isPasswordLongEnough
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {isPasswordLongEnough
                    ? lang === 'ar'
                      ? '✓ طول كلمة المرور ممتاز'
                      : '✓ Length OK'
                    : lang === 'ar'
                    ? `${password.length} من 6 خانات مطلوبة`
                    : `${password.length}/6 required`}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (diagnostic?.field === 'password') setDiagnostic(null);
                }}
                placeholder="••••••••"
                className={`w-full ps-9 pe-8 py-2.5 text-xs rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                  diagnostic?.field === 'password'
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                    : mode === 'register' && isPasswordLongEnough
                    ? 'border-emerald-600/70 focus:ring-2 focus:ring-emerald-500'
                    : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                }`}
              />
              {mode === 'register' && isPasswordLongEnough && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-1/2 -translate-y-1/2 end-2.5" />
              )}
            </div>
          </div>

          {/* Confirm Password (only on Register) */}
          {mode === 'register' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 text-start">
                  {t.confirmPassword}
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    className={`text-[10px] font-bold ${
                      isPasswordMatching ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPasswordMatching
                      ? lang === 'ar'
                        ? '✓ كلمتا المرور متطابقتان'
                        : '✓ Passwords match'
                      : lang === 'ar'
                      ? '✗ غير متطابقتين بعد'
                      : '✗ Do not match yet'}
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (diagnostic?.field === 'confirmPassword') setDiagnostic(null);
                  }}
                  placeholder="••••••••"
                  className={`w-full ps-9 pe-8 py-2.5 text-xs rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                    confirmPassword.length > 0 && !isPasswordMatching
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                      : isPasswordMatching
                      ? 'border-emerald-600/70 focus:ring-2 focus:ring-emerald-500'
                      : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
                {isPasswordMatching && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-1/2 -translate-y-1/2 end-2.5" />
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {loading
                ? lang === 'ar'
                  ? 'جارٍ التحقق وتأكيد البيانات...'
                  : 'Verifying credentials...'
                : mode === 'login'
                ? t.login
                : t.register}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-0.5">
          <div className="flex-1 h-[1px] bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase">{lang === 'ar' ? 'أو' : 'OR'}</span>
          <div className="flex-1 h-[1px] bg-slate-800" />
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold text-xs border border-slate-700 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

        {/* Google Account Selector Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-start">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <h3 className="font-bold text-sm text-white">
                    {lang === 'ar' ? 'تسجيل الدخول بحساب Google' : 'Sign in with Google'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'اختر حساب Google للمتابعة الفورية وحفظ كل تقدمك السحابي:'
                  : 'Choose a Google account to proceed and sync your progress:'}
              </p>

              {/* Fast One-Click with Detected Account */}
              <button
                type="button"
                onClick={() => handleGoogleSignIn('dmohamede555@gmail.com')}
                disabled={loading}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors cursor-pointer text-start w-full group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                  D
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    dmohamede555@gmail.com
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'الحساب الموصى به' : 'Active Account'}</span>
                  </div>
                </div>
              </button>

              {/* Or enter custom email */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-400">
                  {lang === 'ar' ? 'أو استخدم بريد Google آخر:' : 'Or use another Google email:'}
                </label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(googleEmailInput)}
                  disabled={loading || !googleEmailInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? lang === 'ar'
                        ? 'جارٍ الدخول...'
                        : 'Logging in...'
                      : lang === 'ar'
                      ? 'دخول بحساب Google'
                      : 'Sign In'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.securityProtected}</span>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[11px] text-slate-600 py-1 z-10">
        Sudoku Master &copy; {new Date().getFullYear()} &middot; {lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
      </div>
    </div>
  );
};
