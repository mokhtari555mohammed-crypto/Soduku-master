import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { setupWebSocketServer } from './server/socketHandler.js';
import { generateSudoku } from './server/sudokuGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(express.json({ limit: '100kb' })); // Mitigate Large Payload DOS

// Security: Rate limiting & Brute-force protection map
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const requestLimiter = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Global API rate limiter middleware (max 120 reqs / min)
app.use('/api', (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const current = requestLimiter.get(ip) || { count: 0, resetAt: now + 60000 };

  if (now > current.resetAt) {
    current.count = 1;
    current.resetAt = now + 60000;
  } else {
    current.count++;
  }
  requestLimiter.set(ip, current);

  if (current.count > 150) {
    return res.status(429).json({ error: 'تم تجاوز الحد المسموح من الطلبات / Too many requests' });
  }
  next();
});

// Helper: Sanitize string input to prevent injection attacks
function sanitizeString(str: any, maxLength = 100): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"'/]/g, '').trim().substring(0, maxLength);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication / User registration
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, avatar } = req.body;
  const customUserId = req.body.userId && typeof req.body.userId === 'string' && req.body.userId.trim()
    ? sanitizeString(req.body.userId.trim(), 64)
    : undefined;

  // 1. If customUserId is already registered (e.g. Firebase Auth sync or reconnect), return existing user
  if (customUserId) {
    const existingById = db.getUserById(customUserId);
    if (existingById) {
      const profile = db.getProfile(existingById.id);
      return res.json({
        user: { id: existingById.id, username: existingById.username, email: existingById.email, avatar: existingById.avatar, createdAt: existingById.createdAt, isGuest: false },
        profile,
      });
    }
  }

  const cleanUsername = sanitizeString(username, 30);
  const cleanEmail = email && typeof email === 'string' && email.trim() ? sanitizeString(email, 80).toLowerCase() : undefined;

  // 2. Validate cleanUsername
  if (!cleanUsername || cleanUsername.length < 2) {
    return res.status(400).json({
      error: 'اسم المستخدم قصير جداً؛ يجب أن يتكون من حرفين على الأقل',
      errorEn: 'Username is too short; it must be at least 2 characters',
      code: 'USERNAME_TOO_SHORT',
      field: 'username',
      suggestion: 'يرجى كتابة اسم مكون من حرفين أو أكثر (مثال: بطل_السودوكو)',
    });
  }

  // 3. Validate password
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      error: `كلمة المرور يجب أن تتكون من 6 خانات على الأقل (أدخلت ${password ? String(password).length : 0} خانات)`,
      errorEn: `Password must be at least 6 characters (you entered ${password ? String(password).length : 0})`,
      code: 'PASSWORD_TOO_SHORT',
      field: 'password',
      suggestion: 'اختر كلمة مرور مكونة من 6 خانات أو أكثر لتأمين حسابك',
    });
  }

  // 4. Validate email format if provided
  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: `صيغة البريد الإلكتروني "${cleanEmail}" غير صحيحة`,
        errorEn: `Invalid email address format: "${cleanEmail}"`,
        code: 'INVALID_EMAIL_FORMAT',
        field: 'email',
        suggestion: 'تأكد من كتابة البريد مثل name@example.com أو اتركه فارغاً (اختياري)',
      });
    }

    const existingEmailUser = db.getUserByEmail(cleanEmail);
    if (existingEmailUser && (!customUserId || existingEmailUser.id !== customUserId)) {
      return res.status(400).json({
        error: `البريد الإلكتروني "${cleanEmail}" مسجل بالفعل لحساب آخر`,
        errorEn: `Email "${cleanEmail}" is already registered to another account`,
        code: 'EMAIL_ALREADY_EXISTS',
        field: 'email',
        suggestion: 'يمكنك الانتقال لتبويب "تسجيل الدخول" بالبريد نفسه، أو كتابة بريد آخر',
      });
    }
  }

  // 5. Check username uniqueness
  const existingUsernameUser = db.getUserByUsername(cleanUsername);
  if (existingUsernameUser && (!customUserId || existingUsernameUser.id !== customUserId)) {
    const suggestedSuffix = Math.floor(10 + Math.random() * 90);
    return res.status(400).json({
      error: `اسم المستخدم "${cleanUsername}" مسجل ومأخوذ بالفعل من قِبل لاعب آخر`,
      errorEn: `Username "${cleanUsername}" is already taken by another player`,
      code: 'USERNAME_ALREADY_EXISTS',
      field: 'username',
      suggestion: `جرب اسماً مميزاً مثل "${cleanUsername}_${suggestedSuffix}" أو "${cleanUsername}2026"`,
    });
  }

  // Cryptographic Salted Hashing
  const { salt, hash } = hashPassword(password);
  const userId = customUserId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const user = db.createUser({
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    salt,
    passwordHash: hash,
    avatar: avatar && typeof avatar === 'string' ? sanitizeString(avatar, 20) : 'user_1',
    createdAt: new Date().toISOString(),
    isGuest: false,
  });

  const profile = db.getProfile(userId);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: false },
    profile,
  });
});

// Login endpoint (handles email OR username seamlessly)
app.post('/api/auth/login', (req, res) => {
  const { email, password, username, emailOrUser } = req.body;
  const rawId = (emailOrUser || username || email || '').toString().trim();
  const cleanId = sanitizeString(rawId, 80);
  const cleanPass = (password || '').toString();

  if (!cleanId) {
    return res.status(400).json({
      error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني',
      errorEn: 'Please enter your username or email',
      code: 'MISSING_IDENTIFIER',
      field: 'identifier',
      suggestion: 'أدخل اسم المستخدم الذي أنشأت به حسابك أو بريدك الإلكتروني',
    });
  }

  if (!cleanPass) {
    return res.status(400).json({
      error: 'يرجى إدخال كلمة المرور الخاصة بحسابك',
      errorEn: 'Please enter your password',
      code: 'MISSING_PASSWORD',
      field: 'password',
      suggestion: 'أدخل كلمة المرور التي اخترتها عند التسجيل',
    });
  }

  // Find user by email OR username (case-insensitive)
  let user = db.getUserByEmail(cleanId) || db.getUserByUsername(cleanId);
  if (!user) {
    user = Object.values((db as any).data.users as Record<string, any>).find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
    );
  }

  if (!user) {
    return res.status(401).json({
      error: `لم يتم العثور على أي حساب مسجل باسم أو بريد "${cleanId}"`,
      errorEn: `No registered account found for "${cleanId}"`,
      code: 'USER_NOT_FOUND',
      field: 'identifier',
      suggestion: 'تأكد من كتابة الاسم أو البريد بشكل صحيح، أو اضغط على "إنشاء حساب" للتسجيل كلاعب جديد',
    });
  }

  const isValidPass =
    user.passwordHash && user.salt
      ? verifyPassword(cleanPass, user.salt, user.passwordHash)
      : user.passwordHash === `hashed_${cleanPass}` || user.passwordHash === cleanPass;

  if (!isValidPass) {
    return res.status(401).json({
      error: 'كلمة المرور غير صحيحة، يرجى التأكد وإعادة المحاولة',
      errorEn: 'Incorrect password, please check and try again',
      code: 'WRONG_PASSWORD',
      field: 'password',
      suggestion: 'تأكد من حالة الأحرف (كبيرة/صغيرة) ومن صحة لوحة المفاتيح',
    });
  }

  const profile = db.getProfile(user.id);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: user.isGuest },
    profile,
  });
});

// Google Authentication endpoint
app.post('/api/auth/google', (req, res) => {
  const { googleUid, email, displayName, avatar } = req.body;
  const cleanEmail = (email || '').toString().trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ error: 'يرجى تحديد البريد الإلكتروني لحساب Google' });
  }

  let user = db.getUserByEmail(cleanEmail);

  if (!user) {
    const rawName = displayName || cleanEmail.split('@')[0];
    let uniqueUsername = sanitizeString(rawName, 25);
    if (!uniqueUsername || db.getUserByUsername(uniqueUsername)) {
      uniqueUsername = `${uniqueUsername || 'GooglePlayer'}_${Math.floor(100 + Math.random() * 900)}`;
    }
    const userId = `g_${googleUid ? sanitizeString(googleUid, 32) : Date.now()}`;
    user = db.createUser({
      id: userId,
      username: uniqueUsername,
      email: cleanEmail,
      avatar: avatar || 'user_1',
      createdAt: new Date().toISOString(),
      isGuest: false,
    });
  }

  const profile = db.getProfile(user.id);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: false },
    profile,
  });
});

// Profile update
app.put('/api/profile', (req, res) => {
  const { userId, username, avatar } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const updated = db.updateProfile(userId, {
    ...(username ? { username: username.trim() } : {}),
    ...(avatar ? { avatar } : {}),
  });

  if (!updated) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile: updated });
});

// Get user profile
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  const profile = db.getProfile(userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ profile });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const period = (req.query.period as 'all' | 'monthly' | 'weekly' | 'daily') || 'all';
  const list = db.getLeaderboard(period);
  res.json({ leaderboard: list, period });
});

// Offline Progress Get
app.get('/api/offline/progress/:userId', (req, res) => {
  const { userId } = req.params;
  const progress = db.getOfflineProgress(userId);
  res.json({ progress });
});

// Offline Progress Complete Level
app.post('/api/offline/complete', (req, res) => {
  const { userId, levelNumber, stars, timeSeconds } = req.body;
  if (!userId || !levelNumber) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const progress = db.completeOfflineLevel(userId, Number(levelNumber), Number(stars || 1), Number(timeSeconds || 0));
  res.json({ progress });
});

// Sudoku Level Generator (for level verification if requested)
app.get('/api/sudoku/generate', (req, res) => {
  const clues = Math.max(24, Math.min(60, Number(req.query.clues) || 36));
  const seed = req.query.seed ? Number(req.query.seed) : undefined;
  const puzzleData = generateSudoku(clues, seed);
  res.json(puzzleData);
});

// Initialize WebSocket server
const wss = new WebSocketServer({ server });
setupWebSocketServer(wss);

// Mount Vite or serve static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Sudoku Server] Running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
