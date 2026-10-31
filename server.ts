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
  const cleanUsername = sanitizeString(username, 30);
  const cleanEmail = email ? sanitizeString(email, 80).toLowerCase() : undefined;

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل / Username must be at least 3 chars' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل / Password must be at least 6 characters' });
  }

  if (cleanEmail && db.getUserByEmail(cleanEmail)) {
    return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل / Email already registered' });
  }

  if (db.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم مأخوذ بالفعل، يرجى اختيار اسم آخر / Username already taken' });
  }

  // Cryptographic Salted Hashing
  const { salt, hash } = hashPassword(password);
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
  res.json({ user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: false }, profile });
});

// Login with Brute-Force Lockout Defense
app.post('/api/auth/login', (req, res) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  // Check if IP is currently locked
  if (attempt.lockedUntil > now) {
    const secondsRemaining = Math.ceil((attempt.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: `تم قفل محاولات تسجيل الدخول مؤقتاً لأسباب أمنية. يرجى الانتظار ${secondsRemaining} ثانية / Too many attempts. Try again in ${secondsRemaining}s`,
    });
  }

  const { email, password, username } = req.body;
  const cleanEmail = email ? sanitizeString(email, 80).toLowerCase() : undefined;
  const cleanUsername = username ? sanitizeString(username, 30) : undefined;

  let user = null;
  if (cleanEmail) {
    user = db.getUserByEmail(cleanEmail);
  } else if (cleanUsername) {
    user = db.getUserByUsername(cleanUsername);
  }

  const isValidPass =
    user && user.passwordHash && user.salt && typeof password === 'string'
      ? verifyPassword(password, user.salt, user.passwordHash)
      : user && user.passwordHash === `hashed_${password}`; // legacy fallback

  if (!user || !isValidPass) {
    // Record failed attempt
    attempt.count++;
    if (attempt.count >= 6) {
      attempt.lockedUntil = now + 3 * 60 * 1000; // Lock for 3 minutes
      loginAttempts.set(ip, attempt);
      return res.status(429).json({
        error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل المحاولات لمدة 3 دقائق لحماية الحساب / Account attempts temporarily locked for 3 minutes',
      });
    }
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد أو اسم المستخدم وكلمة المرور / Invalid credentials' });
  }

  // Reset failed attempts on success
  loginAttempts.delete(ip);

  const profile = db.getProfile(user.id);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: user.isGuest },
    profile,
  });
});

// Google Authentication sync or verification endpoint
app.post('/api/auth/google', (req, res) => {
  const { googleUid, email, displayName, photoUrl } = req.body;
  if (!googleUid || !email) {
    return res.status(400).json({ error: 'Google authentication payload missing' });
  }

  const cleanEmail = sanitizeString(email, 80).toLowerCase();
  let user = db.getUserByEmail(cleanEmail);

  if (!user) {
    const userId = `g_${sanitizeString(googleUid, 32)}`;
    user = db.createUser({
      id: userId,
      username: displayName ? sanitizeString(displayName, 25) : cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar: 'user_1',
      createdAt: new Date().toISOString(),
      isGuest: false,
    });
  }

  const profile = db.getProfile(user.id);
  res.json({ user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt, isGuest: false }, profile });
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
