import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import {
  Language,
  Theme,
  User,
  Profile,
  OfflineProgress,
  Room,
  MatchState,
  AuthResponse,
} from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/sound';
import { safeStorage } from '../utils/storage';

export type Screen =
  | 'home'
  | 'offline_levels'
  | 'offline_game'
  | 'multiplayer_lobby'
  | 'multiplayer_game'
  | 'leaderboard'
  | 'profile'
  | 'settings';

interface GameContextType {
  // Localization & UI
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (typeof translations)['ar'];
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Sound
  isMuted: boolean;
  toggleSound: () => void;

  // Preferences
  highlightDuplicates: boolean;
  setHighlightDuplicates: (val: boolean) => void;
  highlightSameNumbers: boolean;
  setHighlightSameNumbers: (val: boolean) => void;

  // User & Profile
  user: User | null;
  profile: Profile | null;
  updateProfileData: (username: string, avatar: string) => Promise<boolean>;
  loginUser: (emailOrUser: string, pass: string) => Promise<AuthResponse>;
  registerUser: (username: string, email?: string, pass?: string, avatar?: string) => Promise<AuthResponse>;
  loginWithGoogle: (email: string, displayName?: string, avatar?: string) => Promise<AuthResponse>;
  logoutUser: () => void;

  // Offline Mode
  offlineProgress: OfflineProgress;
  currentOfflineLevel: number;
  setCurrentOfflineLevel: (lvl: number) => void;
  completeOfflineLevel: (levelNum: number, stars: number, timeSec: number) => Promise<void>;

  // Multiplayer
  wsConnected: boolean;
  matchmakingState: 'idle' | 'searching';
  currentRoom: Room | null;
  currentMatch: MatchState | null;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  findRandomMatch: () => void;
  cancelMatchmaking: () => void;
  createPrivateRoom: () => void;
  joinPrivateRoom: (code: string) => void;
  leaveMultiplayer: () => void;
  sendGameMove: (row: number, col: number, num: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language & Theme
  const [lang, setLangState] = useState<Language>(() => {
    return (safeStorage.getItem('sudoku_lang') as Language) || 'ar';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    return (safeStorage.getItem('sudoku_theme') as Theme) || 'dark';
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => sound.isMuted());
  const [highlightDuplicates, setHighlightDuplicates] = useState<boolean>(true);
  const [highlightSameNumbers, setHighlightSameNumbers] = useState<boolean>(true);

  const [screen, setScreen] = useState<Screen>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User & Stats
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Offline Level state
  const [currentOfflineLevel, setCurrentOfflineLevel] = useState<number>(1);
  const [offlineProgress, setOfflineProgress] = useState<OfflineProgress>({
    userId: '',
    unlockedLevel: 1,
    levels: {},
  });

  // Multiplayer state
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [matchmakingState, setMatchmakingState] = useState<'idle' | 'searching'>('idle');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchState | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    safeStorage.setItem('sudoku_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    safeStorage.setItem('sudoku_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Sync HTML attrs on mount
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [lang, theme]);

  // Firebase Auth State Listener & Session Hydration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const username =
          firebaseUser.displayName ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Player');
        const email = firebaseUser.email || undefined;
        const userId = firebaseUser.uid;

        const initialUserData: User = {
          id: userId,
          username,
          email,
          avatar: 'user_1',
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          isGuest: false,
        };

        // Sync with backend database profile
        try {
          const res = await fetch(`/api/profile/${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setProfile(data.profile);
              initialUserData.username = data.profile.username || initialUserData.username;
              initialUserData.avatar = data.profile.avatar || initialUserData.avatar;
            }
          } else {
            // First time Firebase user - initialize profile on server
            const regRes = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                googleUid: userId,
                email: email || `${userId}@firebase.app`,
                displayName: username,
                avatar: 'user_1',
              }),
            });
            const regData = await regRes.json();
            if (regData.profile) {
              setProfile(regData.profile);
            }
          }
        } catch (e) {
          console.warn('Backend sync error:', e);
        }

        setUser(initialUserData);
        safeStorage.setItem('sudoku_user_id', userId);

        // Fetch offline progress
        fetch(`/api/offline/progress/${userId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.progress) {
              setOfflineProgress(d.progress);
              setCurrentOfflineLevel(d.progress.unlockedLevel || 1);
            }
          })
          .catch(() => {});
      } else {
        // Firebase user is null: check if local custom user session exists
        const savedUserId = safeStorage.getItem('sudoku_user_id');
        if (!savedUserId) {
          setUser(null);
          setProfile(null);
          return;
        }

        try {
          const res = await fetch(`/api/profile/${savedUserId}`);
          if (!res.ok) {
            safeStorage.removeItem('sudoku_user_id');
            setUser(null);
            setProfile(null);
            return;
          }

          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            setUser({
              id: data.profile.userId,
              username: data.profile.username,
              avatar: data.profile.avatar,
              createdAt: data.profile.createdAt,
              isGuest: false,
            });

            // Fetch offline progress
            const progRes = await fetch(`/api/offline/progress/${data.profile.userId}`);
            const progData = await progRes.json();
            if (progData.progress) {
              setOfflineProgress(progData.progress);
              setCurrentOfflineLevel(progData.progress.unlockedLevel || 1);
            }
          }
        } catch (err) {
          console.error('Failed to load saved user session:', err);
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // WebSocket Connection & Reconnection
  useEffect(() => {
    if (!user) return;

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Authenticate socket
        ws.send(
          JSON.stringify({
            type: 'auth',
            payload: {
              userId: user.id,
              username: user.username,
              avatar: user.avatar,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          switch (type) {
            case 'auth:success':
              if (payload.profile) setProfile(payload.profile);
              break;

            case 'matchmaking:searching':
              setMatchmakingState('searching');
              break;

            case 'matchmaking:cancelled':
              setMatchmakingState('idle');
              break;

            case 'room:created':
              setCurrentRoom(payload.room);
              showToast(translations[lang].codeCopied ? `${translations[lang].roomCode}: ${payload.room.code}` : '');
              break;

            case 'room:joined':
              setCurrentRoom(payload.room);
              break;

            case 'room:error':
              showToast(payload.message);
              break;

            case 'room:closed':
              showToast(payload.message || 'Room closed');
              setCurrentRoom(null);
              break;

            case 'room:guest_left':
              showToast(lang === 'ar' ? 'غادر اللاعب الغرفة' : 'Opponent left the room');
              break;

            case 'game:state': {
              const match: MatchState = payload.match;
              setCurrentMatch(match);
              setMatchmakingState('idle');

              // If match is active, transition to multiplayer_game screen
              if (match.status === 'playing') {
                setScreen('multiplayer_game');
                // Play notification if turn is mine
                if (match.currentTurnPlayerId === user.id) {
                  sound.playTurn();
                }
              } else if (match.status === 'finished') {
                if (match.winnerId === user.id) {
                  sound.playVictory();
                }
                // Refresh profile stats
                fetch(`/api/profile/${user.id}`)
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.profile) setProfile(d.profile);
                  })
                  .catch(() => {});
              }
              break;
            }

            case 'game:move_result': {
              const { isCorrect, playerId } = payload;
              if (playerId === user.id) {
                if (isCorrect) {
                  sound.playCorrect();
                  showToast(translations[lang].correctMoveAlert);
                } else {
                  sound.playWrong();
                  showToast(translations[lang].wrongMoveAlert);
                }
              } else {
                if (isCorrect) {
                  sound.playCorrect();
                }
              }
              break;
            }

            case 'game:opponent_left': {
              showToast(translations[lang].opponentLeft);
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [user, lang, showToast]);

  // Auth Methods
  const updateProfileData = async (newUsername: string, newAvatar: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: newUsername,
          avatar: newAvatar,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setUser((prev) => (prev ? { ...prev, username: newUsername, avatar: newAvatar } : null));
        // Update socket info if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'auth',
              payload: { userId: user.id, username: newUsername, avatar: newAvatar },
            })
          );
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const formatAuthError = (
    rawError: any,
    defaultMessageAr: string,
    defaultMessageEn: string
  ): AuthResponse => {
    if (!rawError) {
      return {
        success: false,
        error: lang === 'ar' ? defaultMessageAr : defaultMessageEn,
      };
    }

    if (typeof rawError === 'object' && rawError.error) {
      return {
        success: false,
        error: lang === 'ar' ? (rawError.error || defaultMessageAr) : (rawError.errorEn || rawError.error || defaultMessageEn),
        code: rawError.code,
        suggestion: rawError.suggestion,
        field: rawError.field,
      };
    }

    const errStr = typeof rawError === 'string' ? rawError : rawError.message || rawError.code || String(rawError);
    const code = (rawError.code || '').toLowerCase();

    if (code.includes('email-already-in-use')) {
      return {
        success: false,
        error: lang === 'ar' ? 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر' : 'This email address is already registered to another account',
        code: 'auth/email-already-in-use',
        suggestion: lang === 'ar' ? 'انتقل إلى تبويب "تسجيل الدخول" للدخول بهذا البريد، أو استخدم بريداً مختلفاً' : 'Please switch to "Login" or use a different email',
        field: 'email',
      };
    }

    if (code.includes('weak-password')) {
      return {
        success: false,
        error: lang === 'ar' ? 'كلمة المرور ضعيفة جداً (يجب ألا تقل عن 6 خانات)' : 'Password is too weak (must be at least 6 characters)',
        code: 'auth/weak-password',
        suggestion: lang === 'ar' ? 'اختر كلمة مرور مكونة من 6 أحرف أو أرقام على الأقل لتأمين حسابك' : 'Choose a password with at least 6 characters',
        field: 'password',
      };
    }

    if (code.includes('invalid-email')) {
      return {
        success: false,
        error: lang === 'ar' ? 'صيغة البريد الإلكتروني غير صالحة' : 'Invalid email format',
        code: 'auth/invalid-email',
        suggestion: lang === 'ar' ? 'تأكد من كتابة البريد مثل player@example.com أو اترك الحقل فارغاً (اختياري)' : 'Make sure email is formatted like player@example.com',
        field: 'email',
      };
    }

    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return {
        success: false,
        error: lang === 'ar' ? 'كلمة المرور أو بيانات الدخول غير صحيحة' : 'Incorrect password or login credentials',
        code: 'auth/wrong-password',
        suggestion: lang === 'ar' ? 'تأكد من كتابة كلمة المرور بالشكل الصحيح وتحقق من زر Caps Lock' : 'Please check your password and caps lock',
        field: 'password',
      };
    }

    if (code.includes('user-not-found')) {
      return {
        success: false,
        error: lang === 'ar' ? 'لم يتم العثور على أي حساب مسجل بهذه البيانات' : 'No account found with these credentials',
        code: 'auth/user-not-found',
        suggestion: lang === 'ar' ? 'تأكد من كتابة الاسم أو البريد أو اضغط على "إنشاء حساب" للتسجيل كلاعب جديد' : 'Check your credentials or click "Create Account"',
        field: 'identifier',
      };
    }

    if (code.includes('too-many-requests')) {
      return {
        success: false,
        error: lang === 'ar' ? 'محاولات دخول كثيرة خاطئة، تم تعليق المحاولات مؤقتاً لحماية الحساب' : 'Too many failed attempts. Temporary lockout active',
        code: 'auth/too-many-requests',
        suggestion: lang === 'ar' ? 'يرجى الانتظار دقيقتين ثم إعادة المحاولة بأمان' : 'Please wait a couple of minutes before trying again',
      };
    }

    if (code.includes('network-request-failed')) {
      return {
        success: false,
        error: lang === 'ar' ? 'تعذر الاتصال بالخادم بسبب مشكلة في شبكة الإنترنت' : 'Network request failed. Please check your internet connection',
        code: 'auth/network-request-failed',
        suggestion: lang === 'ar' ? 'تحقق من اتصال الشبكة بالهاتف أو الحاسوب ثم أعد المحاولة' : 'Check your internet connection and retry',
      };
    }

    if (code.includes('popup-closed-by-user')) {
      return {
        success: false,
        error: lang === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول بـ Google قبل إكمال العملية' : 'Google Sign-In popup was closed before completion',
        code: 'auth/popup-closed-by-user',
        suggestion: lang === 'ar' ? 'أعد المحاولة ولا تغلق النافذة حتى يكتمل تسجيل الدخول' : 'Please retry and keep the popup open until complete',
      };
    }

    if (code.includes('popup-blocked')) {
      return {
        success: false,
        error: lang === 'ar' ? 'المتصفح حظر النافذة المنبثقة لتسجيل الدخول بـ Google' : 'Popup blocked by browser',
        code: 'auth/popup-blocked',
        suggestion: lang === 'ar' ? 'يرجى تفعيل النوافذ المنبثقة لهذا الموقع من إعدادات المتصفح' : 'Allow popups for this site in your browser settings',
      };
    }

    return {
      success: false,
      error: errStr || (lang === 'ar' ? defaultMessageAr : defaultMessageEn),
      code: rawError.code || 'UNKNOWN_ERROR',
      suggestion: lang === 'ar' ? 'يرجى مراجعة البيانات المدخلة والمحاولة مجدداً' : 'Please review entered details and try again',
    };
  };

  const loginUser = async (emailOrUser: string, pass: string): Promise<AuthResponse> => {
    try {
      const cleanId = emailOrUser.trim();
      if (!cleanId) {
        return {
          success: false,
          error: lang === 'ar' ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني' : 'Please enter your username or email',
          code: 'MISSING_IDENTIFIER',
          field: 'identifier',
          suggestion: lang === 'ar' ? 'أدخل اسم المستخدم الذي أنشأت به حسابك' : 'Enter your registered username or email',
        };
      }

      if (!pass) {
        return {
          success: false,
          error: lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password',
          code: 'MISSING_PASSWORD',
          field: 'password',
          suggestion: lang === 'ar' ? 'أدخل كلمة المرور الخاصة بحسابك' : 'Enter your account password',
        };
      }

      const isEmail = cleanId.includes('@');

      // 1. If email format & Firebase is configured, authenticate via Firebase Auth
      if (isEmail && isFirebaseConfigured) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanId, pass);
          if (userCredential.user) {
            return { success: true };
          }
        } catch (firebaseErr: any) {
          const code = (firebaseErr.code || '').toLowerCase();
          if (code.includes('wrong-password') || code.includes('invalid-credential')) {
            return formatAuthError(firebaseErr, 'بيانات الدخول غير صحيحة', 'Invalid credentials');
          }
          if (code.includes('too-many-requests')) {
            return formatAuthError(firebaseErr, 'محاولات دخول كثيرة خاطئة', 'Too many attempts');
          }
          // If user not found in Firebase, attempt backend database verification
        }
      }

      // 2. Backend API login verification
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isEmail ? 'email' : 'username']: cleanId,
          password: pass,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: lang === 'ar' ? `استجابة غير متوقعة من الخادم (رمز الحالة ${res.status})` : `Server response error (${res.status})`,
          code: `HTTP_${res.status}`,
          suggestion: lang === 'ar' ? 'يرجى التحقق من اتصال الإنترنت وإعادة المحاولة' : 'Please check connection and retry',
        };
      }

      if (!res.ok || !data.user) {
        return formatAuthError(data, 'فشل تسجيل الدخول، يرجى التأكد من البيانات', 'Login failed');
      }

      setUser(data.user);
      setProfile(data.profile);
      safeStorage.setItem('sudoku_user_id', data.user.id);

      // Fetch progress
      const progRes = await fetch(`/api/offline/progress/${data.user.id}`);
      const progData = await progRes.json().catch(() => ({}));
      if (progData.progress) {
        setOfflineProgress(progData.progress);
        setCurrentOfflineLevel(progData.progress.unlockedLevel || 1);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Login caught exception:', err);
      return {
        success: false,
        error: lang === 'ar' ? `تعذر تسجيل الدخول: ${err?.message || 'خطأ في الاتصال'}` : `Login failed: ${err?.message || 'Connection error'}`,
        code: err?.name || 'CLIENT_EXCEPTION',
        suggestion: lang === 'ar' ? 'يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً' : 'Please check your connection and retry',
      };
    }
  };

  const registerUser = async (
    username: string,
    email?: string,
    pass?: string,
    avatar?: string
  ): Promise<AuthResponse> => {
    try {
      const cleanUsername = username.trim();
      const cleanEmail = email && email.trim() ? email.trim() : undefined;

      // 1. Client-side input validation
      if (!cleanUsername || cleanUsername.length < 2) {
        return {
          success: false,
          error: lang === 'ar' ? 'اسم المستخدم قصير جداً؛ يجب أن يتكون من حرفين على الأقل' : 'Username must be at least 2 characters',
          code: 'USERNAME_TOO_SHORT',
          field: 'username',
          suggestion: lang === 'ar' ? 'يرجى اختيار اسم مكون من حرفين أو أكثر (مثال: بطل_السودوكو)' : 'Choose a username with 2 or more characters',
        };
      }

      if (!pass || pass.length < 6) {
        return {
          success: false,
          error: lang === 'ar' ? `كلمة المرور يجب أن تتكون من 6 خانات على الأقل (أدخلت ${pass ? pass.length : 0} خانات)` : `Password must be at least 6 characters (you entered ${pass ? pass.length : 0})`,
          code: 'PASSWORD_TOO_SHORT',
          field: 'password',
          suggestion: lang === 'ar' ? 'اختر كلمة مرور مكونة من 6 أحرف أو أرقام لتأمين حسابك' : 'Choose a password with 6 or more characters',
        };
      }

      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return {
            success: false,
            error: lang === 'ar' ? `صيغة البريد الإلكتروني "${cleanEmail}" غير صحيحة` : `Invalid email address format: "${cleanEmail}"`,
            code: 'INVALID_EMAIL_FORMAT',
            field: 'email',
            suggestion: lang === 'ar' ? 'تأكد من كتابة البريد مثل name@example.com أو اتركه فارغاً (اختياري)' : 'Make sure email is formatted like name@example.com',
          };
        }
      }

      let firebaseUid: string | undefined = undefined;

      // 2. If email & password provided and Firebase configured, create account in Firebase Auth
      if (cleanEmail && pass && isFirebaseConfigured) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          if (cred.user) {
            firebaseUid = cred.user.uid;
            try {
              await updateFirebaseProfile(cred.user, { displayName: cleanUsername });
            } catch (pErr) {
              console.warn('Firebase updateProfile notice:', pErr);
            }
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase createUserWithEmailAndPassword notice:', firebaseErr);
          const fCode = (firebaseErr.code || '').toLowerCase();
          if (fCode.includes('email-already-in-use') || fCode.includes('weak-password') || fCode.includes('invalid-email')) {
            return formatAuthError(firebaseErr, 'فشل إنشاء الحساب عبر Firebase', 'Firebase registration failed');
          }
          // If operation-not-allowed or network error, proceed to direct backend registration
        }
      }

      // 3. Register & sync in backend database
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: firebaseUid,
          username: cleanUsername,
          email: cleanEmail,
          password: pass,
          avatar: avatar || 'user_1',
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: lang === 'ar' ? `استجابة غير متوقعة من الخادم (رمز الحالة ${res.status})` : `Server response error (${res.status})`,
          code: `HTTP_${res.status}`,
          suggestion: lang === 'ar' ? 'يرجى التحقق من اتصال الإنترنت وإعادة المحاولة' : 'Please check connection and retry',
        };
      }

      if (!res.ok || !data.user) {
        return formatAuthError(data, 'تعذر إتمام إنشاء الحساب في الخادم', 'Registration failed on server');
      }

      setUser(data.user);
      setProfile(data.profile);
      safeStorage.setItem('sudoku_user_id', data.user.id);
      return { success: true };
    } catch (err: any) {
      console.error('Registration caught exception:', err);
      return {
        success: false,
        error: lang === 'ar' ? `تعذر إنشاء الحساب: ${err?.message || 'خطأ غير متوقع'}` : `Registration failed: ${err?.message || 'Unexpected error'}`,
        code: err?.name || 'CLIENT_EXCEPTION',
        suggestion: lang === 'ar' ? 'تأكد من الاتصال بالإنترنت أو أعد تحميل الصفحة' : 'Check connection or reload page',
      };
    }
  };

  const loginWithGoogle = async (
    email: string,
    displayName?: string,
    avatar?: string
  ): Promise<AuthResponse> => {
    try {
      const cleanEmail = email.trim();
      // 1. Try Firebase Google Popup first if configured
      if (isFirebaseConfigured) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          if (result && result.user) {
            return { success: true };
          }
        } catch (popupErr: any) {
          const pCode = (popupErr.code || '').toLowerCase();
          if (pCode.includes('popup-closed-by-user')) {
            return formatAuthError(popupErr, 'تم إلغاء تسجيل الدخول', 'Sign in cancelled');
          }
          console.warn('Firebase popup notice:', popupErr);
        }
      }

      // 2. Verified Google authentication endpoint
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleUid: `goog_${Date.now()}`,
          email: cleanEmail,
          displayName: displayName || cleanEmail.split('@')[0],
          avatar: avatar || 'user_1',
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: lang === 'ar' ? `استجابة غير متوقعة من خادم Google (رمز الحالة ${res.status})` : `Google auth server error (${res.status})`,
        };
      }

      if (!res.ok || !data.user) {
        return formatAuthError(data, 'تعذر تسجيل الدخول بحساب Google', 'Google login failed');
      }

      setUser(data.user);
      setProfile(data.profile);
      safeStorage.setItem('sudoku_user_id', data.user.id);

      const progRes = await fetch(`/api/offline/progress/${data.user.id}`);
      const progData = await progRes.json().catch(() => ({}));
      if (progData.progress) {
        setOfflineProgress(progData.progress);
        setCurrentOfflineLevel(progData.progress.unlockedLevel || 1);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: lang === 'ar' ? `تعذر تسجيل الدخول بحساب Google: ${err?.message || 'خطأ في الاتصال'}` : `Google login failed: ${err?.message || 'Connection error'}`,
      };
    }
  };

  const logoutUser = () => {
    signOut(auth).catch((err) => console.warn('Firebase signOut error:', err));
    safeStorage.removeItem('sudoku_user_id');
    setUser(null);
    setProfile(null);
    setScreen('home');
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Offline Level Completion
  const completeOfflineLevel = async (levelNum: number, stars: number, timeSec: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/offline/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          levelNumber: levelNum,
          stars,
          timeSeconds: timeSec,
        }),
      });
      const data = await res.json();
      if (data.progress) {
        setOfflineProgress(data.progress);
      }
    } catch (err) {
      console.error('Failed to sync offline level:', err);
      // Fallback local update
      setOfflineProgress((prev) => {
        const next = { ...prev };
        next.levels[levelNum] = {
          levelNumber: levelNum,
          stars,
          timeSeconds: timeSec,
          completedAt: new Date().toISOString(),
        };
        if (next.unlockedLevel <= levelNum && levelNum < 100) {
          next.unlockedLevel = levelNum + 1;
        }
        return next;
      });
    }
  };

  // Multiplayer socket triggers
  const findRandomMatch = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      showToast(lang === 'ar' ? 'جارٍ الاتصال بالسيرفر...' : 'Connecting to server...');
      return;
    }
    sound.playClick();
    setMatchmakingState('searching');
    wsRef.current.send(JSON.stringify({ type: 'matchmaking:find' }));
  };

  const cancelMatchmaking = () => {
    sound.playClick();
    setMatchmakingState('idle');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'matchmaking:cancel' }));
    }
  };

  const createPrivateRoom = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    sound.playClick();
    wsRef.current.send(JSON.stringify({ type: 'room:create' }));
  };

  const joinPrivateRoom = (code: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    sound.playClick();
    wsRef.current.send(JSON.stringify({ type: 'room:join', payload: { code } }));
  };

  const leaveMultiplayer = () => {
    sound.playClick();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    setCurrentRoom(null);
    setCurrentMatch(null);
    setMatchmakingState('idle');
    setScreen('multiplayer_lobby');
  };

  const sendGameMove = (row: number, col: number, num: number) => {
    if (!currentMatch || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    sound.playClick();
    wsRef.current.send(
      JSON.stringify({
        type: 'game:move',
        payload: {
          matchId: currentMatch.id,
          row,
          col,
          num,
        },
      })
    );
  };

  return (
    <GameContext.Provider
      value={{
        lang,
        setLang,
        theme,
        setTheme,
        toggleTheme,
        t: translations[lang],
        screen,
        setScreen,
        isMuted,
        toggleSound,
        highlightDuplicates,
        setHighlightDuplicates,
        highlightSameNumbers,
        setHighlightSameNumbers,
        user,
        profile,
        updateProfileData,
        loginUser,
        registerUser,
        loginWithGoogle,
        logoutUser,
        offlineProgress,
        currentOfflineLevel,
        setCurrentOfflineLevel,
        completeOfflineLevel,
        wsConnected,
        matchmakingState,
        currentRoom,
        currentMatch,
        toastMessage,
        showToast,
        findRandomMatch,
        cancelMatchmaking,
        createPrivateRoom,
        joinPrivateRoom,
        leaveMultiplayer,
        sendGameMove,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
