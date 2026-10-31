import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { setupWebSocketServer } from './server/socketHandler.js';
import { generateSudoku } from './server/sudokuGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(express.json());

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication / User registration
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, avatar } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (email && db.getUserByEmail(email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user = db.createUser({
    id: userId,
    username: username.trim(),
    email: email ? email.trim() : undefined,
    passwordHash: password ? `hashed_${password}` : undefined,
    avatar: avatar || 'user_1',
    createdAt: new Date().toISOString(),
    isGuest: false,
  });

  const profile = db.getProfile(userId);
  res.json({ user, profile });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password, username } = req.body;
  let user = null;
  if (email) {
    user = db.getUserByEmail(email);
  } else if (username) {
    user = db.getUserByUsername(username);
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.passwordHash && password && user.passwordHash !== `hashed_${password}`) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const profile = db.getProfile(user.id);
  res.json({ user, profile });
});

// Guest Login / Init
app.post('/api/auth/guest', (req, res) => {
  const { guestId, username, avatar } = req.body;
  let user = guestId ? db.getUserById(guestId) : null;

  if (!user) {
    const id = guestId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    user = db.createUser({
      id,
      username: username || `SudokuPlayer_${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: avatar || `user_${Math.floor(1 + Math.random() * 6)}`,
      createdAt: new Date().toISOString(),
      isGuest: true,
    });
  }

  const profile = db.getProfile(user.id);
  res.json({ user, profile });
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
