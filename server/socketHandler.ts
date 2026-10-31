import { WebSocket, WebSocketServer } from 'ws';
import { db, Match, CellState, MoveRecord } from './db';
import { generateSudoku } from './sudokuGenerator';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  avatar: string;
  currentMatchId?: string;
  currentRoomId?: string;
  turnTimer?: NodeJS.Timeout;
}

// In-memory active connections
const clients = new Map<string, ConnectedClient>();

// Matchmaking queue
let matchmakingQueue: string[] = [];

// Turn timer duration in seconds
const TURN_TIMEOUT_SECONDS = 35;

export function setupWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    let clientUserId: string | null = null;

    ws.on('message', (messageRaw: string) => {
      try {
        const data = JSON.parse(messageRaw.toString());
        const { type, payload } = data;

        switch (type) {
          case 'auth': {
            const { userId, username, avatar } = payload;
            if (!userId) return;
            clientUserId = userId;

            // Save or update user/profile in db
            let user = db.getUserById(userId);
            if (!user) {
              user = db.createUser({
                id: userId,
                username: username || 'Player',
                avatar: avatar || 'user_1',
                createdAt: new Date().toISOString(),
                isGuest: true,
              });
            } else if (username || avatar) {
              db.updateProfile(userId, {
                username: username || user.username,
                avatar: avatar || user.avatar,
              });
            }

            clients.set(userId, {
              ws,
              userId,
              username: user.username,
              avatar: user.avatar,
            });

            ws.send(
              JSON.stringify({
                type: 'auth:success',
                payload: {
                  user,
                  profile: db.getProfile(userId),
                },
              })
            );

            // If user was in an active match, send sync
            for (const match of Object.values((db as any).data.matches as Record<string, Match>)) {
              if (
                match.status === 'playing' &&
                (match.player1.id === userId || match.player2.id === userId)
              ) {
                const client = clients.get(userId);
                if (client) client.currentMatchId = match.id;
                sendMatchState(match.id);
                break;
              }
            }
            break;
          }

          case 'matchmaking:find': {
            if (!clientUserId) return;
            handleMatchmakingFind(clientUserId);
            break;
          }

          case 'matchmaking:cancel': {
            if (!clientUserId) return;
            matchmakingQueue = matchmakingQueue.filter((id) => id !== clientUserId);
            ws.send(JSON.stringify({ type: 'matchmaking:cancelled' }));
            break;
          }

          case 'room:create': {
            if (!clientUserId) return;
            const room = db.createRoom(clientUserId);
            const client = clients.get(clientUserId);
            if (client) client.currentRoomId = room.id;
            ws.send(
              JSON.stringify({
                type: 'room:created',
                payload: { room },
              })
            );
            break;
          }

          case 'room:join': {
            if (!clientUserId) return;
            const { code } = payload;
            const room = db.getRoomByCode(code);
            if (!room) {
              ws.send(
                JSON.stringify({
                  type: 'room:error',
                  payload: { message: 'الغرفة غير موجودة أو انتهت صلاحيتها / Room not found' },
                })
              );
              return;
            }

            if (room.hostId === clientUserId) {
              ws.send(
                JSON.stringify({
                  type: 'room:error',
                  payload: { message: 'أنت منشئ هذه الغرفة بالفعل / You are already host' },
                })
              );
              return;
            }

            if (room.guestId && room.guestId !== clientUserId) {
              ws.send(
                JSON.stringify({
                  type: 'room:error',
                  payload: { message: 'الغرفة ممتلئة بالفعل / Room is full' },
                })
              );
              return;
            }

            db.updateRoom(room.id, { guestId: clientUserId });
            const client = clients.get(clientUserId);
            if (client) client.currentRoomId = room.id;

            // Notify both players in room
            notifyRoomPlayers(room.id, 'room:joined', { room });

            // Start match immediately with both players!
            startMatch(room.hostId, clientUserId, false, room.id);
            break;
          }

          case 'room:leave': {
            if (!clientUserId) return;
            handleLeave(clientUserId);
            break;
          }

          case 'game:move': {
            if (!clientUserId) return;
            const { matchId, row, col, num } = payload;
            handlePlayerMove(clientUserId, matchId, row, col, num);
            break;
          }

          case 'game:sync': {
            if (!clientUserId) return;
            const { matchId } = payload;
            sendMatchState(matchId, clientUserId);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Socket message parse error', err);
      }
    });

    ws.on('close', () => {
      if (clientUserId) {
        matchmakingQueue = matchmakingQueue.filter((id) => id !== clientUserId);
        handleDisconnect(clientUserId);
        clients.delete(clientUserId);
      }
    });
  });
}

function handleMatchmakingFind(userId: string) {
  if (!matchmakingQueue.includes(userId)) {
    matchmakingQueue.push(userId);
  }

  const client = clients.get(userId);
  if (client) {
    client.ws.send(JSON.stringify({ type: 'matchmaking:searching' }));
  }

  // Check if we have 2 distinct connected players
  const availableQueue = matchmakingQueue.filter((id) => clients.has(id));
  matchmakingQueue = availableQueue;

  if (availableQueue.length >= 2) {
    const p1Id = availableQueue.shift()!;
    const p2Id = availableQueue.shift()!;
    startMatch(p1Id, p2Id, true);
  }
}

function startMatch(p1Id: string, p2Id: string, isRandom: boolean, roomId?: string) {
  const p1Client = clients.get(p1Id);
  const p2Client = clients.get(p2Id);
  if (!p1Client || !p2Client) return;

  const p1Profile = db.getProfile(p1Id);
  const p2Profile = db.getProfile(p2Id);

  // Generate Sudoku puzzle for the match (e.g. 36 clues for engaging multiplayer balance)
  const { puzzle, solution } = generateSudoku(36);

  // Count total blanks
  let totalBlanks = 0;
  const gridState: CellState[][] = [];

  for (let r = 0; r < 9; r++) {
    const rowState: CellState[] = [];
    for (let c = 0; c < 9; c++) {
      const val = puzzle[r][c];
      const isClue = val !== 0;
      if (!isClue) totalBlanks++;
      rowState.push({
        val,
        isClue,
        isCorrect: isClue,
      });
    }
    gridState.push(rowState);
  }

  // Random starter
  const currentTurnPlayerId = Math.random() < 0.5 ? p1Id : p2Id;
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const match: Match = {
    id: matchId,
    roomId,
    isRandom,
    player1: {
      id: p1Id,
      username: p1Profile?.username || p1Client.username,
      avatar: p1Profile?.avatar || p1Client.avatar,
      score: 0,
    },
    player2: {
      id: p2Id,
      username: p2Profile?.username || p2Client.username,
      avatar: p2Profile?.avatar || p2Client.avatar,
      score: 0,
    },
    puzzleClues: puzzle,
    secretSolution: solution, // NEVER exposed to clients
    gridState,
    currentTurnPlayerId,
    turnStartedAt: Date.now(),
    turnTimeoutSeconds: TURN_TIMEOUT_SECONDS,
    totalBlanks,
    filledBlanks: 0,
    status: 'playing',
    startedAt: new Date().toISOString(),
    moves: [],
  };

  db.createMatch(match);
  if (roomId) {
    db.updateRoom(roomId, { status: 'playing', currentMatchId: matchId });
  }

  p1Client.currentMatchId = matchId;
  p2Client.currentMatchId = matchId;

  // Broadcast game start to both
  sendMatchState(matchId);

  // Reset & start turn timer
  resetTurnTimer(matchId);
}

// Resets the turn countdown timer on server
const activeTurnTimers = new Map<string, NodeJS.Timeout>();

function resetTurnTimer(matchId: string) {
  if (activeTurnTimers.has(matchId)) {
    clearTimeout(activeTurnTimers.get(matchId)!);
    activeTurnTimers.delete(matchId);
  }

  const match = db.getMatch(matchId);
  if (!match || match.status !== 'playing') return;

  const timer = setTimeout(() => {
    handleTurnTimeout(matchId);
  }, TURN_TIMEOUT_SECONDS * 1000);

  activeTurnTimers.set(matchId, timer);
}

function handleTurnTimeout(matchId: string) {
  const match = db.getMatch(matchId);
  if (!match || match.status !== 'playing') return;

  // Switch turn automatically
  const nextPlayerId =
    match.currentTurnPlayerId === match.player1.id ? match.player2.id : match.player1.id;

  match.currentTurnPlayerId = nextPlayerId;
  match.turnStartedAt = Date.now();
  db.updateMatch(matchId, {
    currentTurnPlayerId: nextPlayerId,
    turnStartedAt: match.turnStartedAt,
  });

  // Broadcast timeout & updated turn
  broadcastToMatch(matchId, {
    type: 'game:turn_timeout',
    payload: {
      previousTurnPlayerId: match.currentTurnPlayerId,
      newTurnPlayerId: nextPlayerId,
    },
  });

  sendMatchState(matchId);
  resetTurnTimer(matchId);
}

function handlePlayerMove(
  playerId: string,
  matchId: string,
  row: number,
  col: number,
  num: number
) {
  const match = db.getMatch(matchId);
  if (!match || match.status !== 'playing') return;

  // Rule 1: Must be player's turn
  if (match.currentTurnPlayerId !== playerId) {
    const client = clients.get(playerId);
    if (client) {
      client.ws.send(
        JSON.stringify({
          type: 'game:error',
          payload: { message: 'ليس دورك حالياً! / Not your turn!' },
        })
      );
    }
    return;
  }

  // Bounds validation
  if (row < 0 || row >= 9 || col < 0 || col >= 9 || num < 1 || num > 9) return;

  const cell = match.gridState[row][col];

  // Rule 2: Cannot modify original clues
  if (cell.isClue) return;

  // Rule 3: Cannot edit already correctly answered cells
  if (cell.isCorrect) return;

  // Rule 4: Server checks against secret solution
  const correctNum = match.secretSolution[row][col];
  const isCorrect = num === correctNum;

  const moveRecord: MoveRecord = {
    moveIndex: match.moves.length + 1,
    playerId,
    row,
    col,
    num,
    isCorrect,
    timestamp: new Date().toISOString(),
  };
  match.moves.push(moveRecord);

  if (isCorrect) {
    cell.val = num;
    cell.isCorrect = true;
    cell.answeredByPlayerId = playerId;
    match.filledBlanks++;

    if (playerId === match.player1.id) {
      match.player1.score++;
    } else {
      match.player2.score++;
    }
  } else {
    // Incorrect move: record last wrong player, value shows in red flash, remains open
    cell.val = num;
    cell.isCorrect = false;
    cell.lastWrongPlayerId = playerId;
  }

  // Switch turn to the other player
  const nextPlayerId =
    match.currentTurnPlayerId === match.player1.id ? match.player2.id : match.player1.id;
  match.currentTurnPlayerId = nextPlayerId;
  match.turnStartedAt = Date.now();

  // Check game completion: all blanks solved correctly
  if (match.filledBlanks >= match.totalBlanks) {
    let winnerId: string | null = null;
    let isDraw = false;

    if (match.player1.score > match.player2.score) {
      winnerId = match.player1.id;
    } else if (match.player2.score > match.player1.score) {
      winnerId = match.player2.id;
    } else {
      isDraw = true;
    }

    db.recordMatchOutcome(matchId, winnerId, isDraw);
    if (activeTurnTimers.has(matchId)) {
      clearTimeout(activeTurnTimers.get(matchId)!);
      activeTurnTimers.delete(matchId);
    }
  } else {
    db.updateMatch(matchId, match);
    resetTurnTimer(matchId);
  }

  // Broadcast move outcome and current sanitized state
  broadcastToMatch(matchId, {
    type: 'game:move_result',
    payload: {
      move: moveRecord,
      row,
      col,
      num,
      isCorrect,
      playerId,
      player1Score: match.player1.score,
      player2Score: match.player2.score,
      nextTurnPlayerId: match.currentTurnPlayerId,
    },
  });

  sendMatchState(matchId);
}

function handleLeave(userId: string) {
  const client = clients.get(userId);
  if (!client) return;

  if (client.currentMatchId) {
    const match = db.getMatch(client.currentMatchId);
    if (match && match.status === 'playing') {
      // Opponent wins by forfeit
      const opponentId = match.player1.id === userId ? match.player2.id : match.player1.id;
      db.recordMatchOutcome(match.id, opponentId, false);
      broadcastToMatch(match.id, {
        type: 'game:opponent_left',
        payload: {
          forfeitUserId: userId,
          winnerId: opponentId,
        },
      });
      sendMatchState(match.id);
    }
    client.currentMatchId = undefined;
  }

  if (client.currentRoomId) {
    const room = db.getRoomById(client.currentRoomId);
    if (room) {
      if (room.hostId === userId) {
        db.updateRoom(room.id, { status: 'finished' });
        notifyRoomPlayers(room.id, 'room:closed', { message: 'أغلق المضيف الغرفة / Host closed room' });
      } else if (room.guestId === userId) {
        db.updateRoom(room.id, { guestId: undefined });
        notifyRoomPlayers(room.id, 'room:guest_left', {});
      }
    }
    client.currentRoomId = undefined;
  }
}

function handleDisconnect(userId: string) {
  handleLeave(userId);
}

// Strips out secretSolution before sending to clients
function sanitizeMatch(match: Match) {
  const { secretSolution, ...publicData } = match;
  return publicData;
}

function sendMatchState(matchId: string, specificUserId?: string) {
  const match = db.getMatch(matchId);
  if (!match) return;

  const publicData = sanitizeMatch(match);
  const payload = JSON.stringify({
    type: 'game:state',
    payload: { match: publicData },
  });

  if (specificUserId) {
    const client = clients.get(specificUserId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  } else {
    for (const pid of [match.player1.id, match.player2.id]) {
      const client = clients.get(pid);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}

function broadcastToMatch(matchId: string, messageObj: any) {
  const match = db.getMatch(matchId);
  if (!match) return;
  const payload = JSON.stringify(messageObj);
  for (const pid of [match.player1.id, match.player2.id]) {
    const client = clients.get(pid);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function notifyRoomPlayers(roomId: string, type: string, payload: any) {
  const room = db.getRoomById(roomId);
  if (!room) return;
  const msg = JSON.stringify({ type, payload });
  for (const pid of [room.hostId, room.guestId].filter(Boolean) as string[]) {
    const client = clients.get(pid);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}
