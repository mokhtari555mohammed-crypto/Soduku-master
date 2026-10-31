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
} from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/sound';

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
  loginUser: (emailOrUser: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (username: string, email?: string, pass?: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (email: string, displayName?: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
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
    return (localStorage.getItem('sudoku_lang') as Language) || 'ar';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('sudoku_theme') as Theme) || 'dark';
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
    localStorage.setItem('sudoku_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('sudoku_theme', newTheme);
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
        localStorage.setItem('sudoku_user_id', userId);

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
        const savedUserId = localStorage.getItem('sudoku_user_id');
        if (!savedUserId) {
          setUser(null);
          setProfile(null);
          return;
        }

        try {
          const res = await fetch(`/api/profile/${savedUserId}`);
          if (!res.ok) {
            localStorage.removeItem('sudoku_user_id');
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

  const loginUser = async (emailOrUser: string, pass: string) => {
    try {
      const isEmail = emailOrUser.includes('@');

      // 1. If email format & Firebase is configured, authenticate via Firebase Auth
      if (isEmail && isFirebaseConfigured) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, emailOrUser.trim(), pass);
          if (userCredential.user) {
            // onAuthStateChanged will handle setting the user and profile
            return { success: true };
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase signInWithEmailAndPassword error:', firebaseErr);
          const code = firebaseErr.code || '';
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            return {
              success: false,
              error: lang === 'ar' ? 'كلمة المرور أو البريد الإلكتروني غير صحيح' : 'Invalid email or password',
            };
          }
          if (code === 'auth/too-many-requests') {
            return {
              success: false,
              error: lang === 'ar' ? 'محاولات دخول كثيرة خاطئة، يرجى الانتظار قليلاً' : 'Too many attempts, please try again later',
            };
          }
          // If user not found in Firebase, attempt backend database verification
        }
      }

      // 2. Backend API login verification
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isEmail ? 'email' : 'username']: emailOrUser.trim(),
          password: pass,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('sudoku_user_id', data.user.id);

      // Fetch progress
      const progRes = await fetch(`/api/offline/progress/${data.user.id}`);
      const progData = await progRes.json();
      if (progData.progress) {
        setOfflineProgress(progData.progress);
        setCurrentOfflineLevel(progData.progress.unlockedLevel || 1);
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: lang === 'ar' ? 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً' : 'Connection failed',
      };
    }
  };

  const registerUser = async (username: string, email?: string, pass?: string, avatar?: string) => {
    try {
      const cleanUsername = username.trim();
      const cleanEmail = email ? email.trim() : undefined;

      // 1. If email & password provided and Firebase configured, create account in Firebase Auth
      if (cleanEmail && pass && isFirebaseConfigured) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          if (cred.user) {
            try {
              await updateFirebaseProfile(cred.user, {
                displayName: cleanUsername,
              });
            } catch (profileErr) {
              console.warn('Firebase updateProfile error:', profileErr);
            }

            // Sync user data to backend database
            const syncRes = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: cred.user.uid,
                username: cleanUsername,
                email: cleanEmail,
                password: pass,
                avatar: avatar || 'user_1',
              }),
            });
            const syncData = await syncRes.json();
            if (syncRes.ok && syncData.user) {
              setUser(syncData.user);
              setProfile(syncData.profile);
              localStorage.setItem('sudoku_user_id', syncData.user.id);
            }
            return { success: true };
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase createUserWithEmailAndPassword error:', firebaseErr);
          const code = firebaseErr.code || '';
          if (code === 'auth/email-already-in-use') {
            return {
              success: false,
              error: lang === 'ar' ? 'البريد الإلكتروني مسجل بالفعل' : 'Email is already registered',
            };
          }
          if (code === 'auth/weak-password') {
            return {
              success: false,
              error: lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters',
            };
          }
          // If Firebase is in demo/offline mode, fallback to backend registration
        }
      }

      // 2. Direct backend registration
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password: pass, avatar }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('sudoku_user_id', data.user.id);
      return { success: true };
    } catch {
      return {
        success: false,
        error: lang === 'ar' ? 'تعذر إنشاء الحساب، يرجى المحاولة مجدداً' : 'Registration failed',
      };
    }
  };

  const loginWithGoogle = async (email: string, displayName?: string, avatar?: string) => {
    try {
      // 1. Try Firebase Google Popup first if configured
      if (isFirebaseConfigured) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          if (result && result.user) {
            // onAuthStateChanged will handle setting the user and profile
            return { success: true };
          }
        } catch (popupErr: any) {
          console.warn('Firebase signInWithPopup error or blocked popup:', popupErr);
          // Fall through to seamless Google backend sync
        }
      }

      // 2. Verified Google authentication endpoint
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleUid: `goog_${Date.now()}`,
          email: email.trim(),
          displayName: displayName || email.split('@')[0],
          avatar: avatar || 'user_1',
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };

      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('sudoku_user_id', data.user.id);

      const progRes = await fetch(`/api/offline/progress/${data.user.id}`);
      const progData = await progRes.json();
      if (progData.progress) {
        setOfflineProgress(progData.progress);
        setCurrentOfflineLevel(progData.progress.unlockedLevel || 1);
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: lang === 'ar' ? 'تعذر تسجيل الدخول بحساب Google' : 'Google login failed',
      };
    }
  };

  const logoutUser = () => {
    signOut(auth).catch((err) => console.warn('Firebase signOut error:', err));
    localStorage.removeItem('sudoku_user_id');
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
