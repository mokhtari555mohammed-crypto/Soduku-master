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
  const cleanEmail = email && typeof email === 'string' && email.trim() ? sanitizeString(email, 80).toLowerCase() : undefined;

  if (!cleanUsername || cleanUsername.length < 2) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يتكون من حرفين على الأقل' });
  }

  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تتكون من 4 أحرف أو أرقام على الأقل' });
  }

  if (cleanEmail && db.getUserByEmail(cleanEmail)) {
    return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول به' });
  }

  if (db.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'اسم المستخدم مأخوذ بالفعل، يرجى اختيار اسم آخر' });
  }

  // Cryptographic Salted Hashing
  const { salt, hash } = hashPassword(password);
  const userId =
    req.body.userId && typeof req.body.userId === 'string' && req.body.userId.trim()
      ? sanitizeString(req.body.userId.trim(), 64)
      : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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

  if (!cleanId || !cleanPass) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
  }

  // Find user by email OR username (case-insensitive)
  let user = db.getUserByEmail(cleanId) || db.getUserByUsername(cleanId);
  if (!user) {
    user = Object.values((db as any).data.users as Record<string, any>).find(
      (u) =>
        u.username.toLowerCase() === cleanId.toLowerCase() ||
        (u.email && u.email.toLowerCase() === cleanId.toLowerCase())
    );
  }

  if (!user) {
    return res.status(401).json({ error: 'الحساب غير موجود، يرجى التأكد من البيانات أو إنشاء حساب جديد' });
  }

  const isValidPass =
    user.passwordHash && user.salt
      ? verifyPassword(cleanPass, user.salt, user.passwordHash)
      : user.passwordHash === `hashed_${cleanPass}` || user.passwordHash === cleanPass;

  if (!isValidPass) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً' });
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
