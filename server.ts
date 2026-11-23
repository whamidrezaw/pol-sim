import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PeerRole = 'host' | 'client';

interface RoomEntry {
  host: WebSocket | null;
  client: WebSocket | null;
  lastActivity: number;
}

interface SocketMeta {
  room: string;
  role: PeerRole;
  msgWindowStart: number;
  msgCount: number;
}

const ROOM_CODE_RE = /^\d{6}$/;
const B64URL_RE = /^[A-Za-z0-9_-]{8,16384}$/;
const MAX_MSGS_PER_WINDOW = 60;
const WINDOW_MS = 10_000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

const rooms = new Map<string, RoomEntry>();
const socketMeta = new WeakMap<WebSocket, SocketMeta>();

function broadcastPresence(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const payload = JSON.stringify({
    type: 'presence',
    room: roomCode,
    hostOnline: room.host !== null && room.host.readyState === WebSocket.OPEN,
    clientOnline: room.client !== null && room.client.readyState === WebSocket.OPEN,
  });
  if (room.host && room.host.readyState === WebSocket.OPEN) {
    room.host.send(payload);
  }
  if (room.client && room.client.readyState === WebSocket.OPEN) {
    room.client.send(payload);
  }
}

function detachSocket(ws: WebSocket) {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  const room = rooms.get(meta.room);
  if (room) {
    if (room[meta.role] === ws) {
      room[meta.role] = null;
      room.lastActivity = Date.now();
    }
    if (!room.host && !room.client) {
      rooms.delete(meta.room);
    } else {
      broadcastPresence(meta.room);
    }
  }
  socketMeta.delete(ws);
}

// Periodically evict stale empty/idle rooms
setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms.entries()) {
    if (room.lastActivity < cutoff) {
      if (room.host && room.host.readyState === WebSocket.OPEN) room.host.close(1000, 'Room expired');
      if (room.client && room.client.readyState === WebSocket.OPEN) room.client.close(1000, 'Room expired');
      rooms.delete(code);
    }
  }
}, 5 * 60 * 1000).unref();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      activeRooms: rooms.size,
      protocol: 'polsim-e2ee-v1',
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/ws/bridge',
    maxPayload: 32 * 1024,
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let data: unknown;
      try {
        data = JSON.parse(raw.toString('utf8'));
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON frame' }));
        return;
      }

      if (!data || typeof data !== 'object') return;
      const msg = data as Record<string, unknown>;

      // Handle pairing room join
      if (msg.type === 'join') {
        const roomCode = typeof msg.room === 'string' ? msg.room.trim() : '';
        const role = msg.role === 'host' || msg.role === 'client' ? msg.role : null;

        if (!ROOM_CODE_RE.test(roomCode) || !role) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code or role' }));
          return;
        }

        // Detach from any previous room first
        detachSocket(ws);

        let room = rooms.get(roomCode);
        if (!room) {
          room = { host: null, client: null, lastActivity: Date.now() };
          rooms.set(roomCode, room);
        }

        const existing = room[role];
        if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
          existing.send(JSON.stringify({ type: 'replaced', role }));
          existing.close(1000, 'Replaced by newer device session');
        }

        room[role] = ws;
        room.lastActivity = Date.now();
        socketMeta.set(ws, {
          room: roomCode,
          role,
          msgWindowStart: Date.now(),
          msgCount: 0,
        });

        ws.send(JSON.stringify({ type: 'joined', room: roomCode, role }));
        broadcastPresence(roomCode);
        return;
      }

      // Rate-limit subsequent messages
      const meta = socketMeta.get(ws);
      if (!meta) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not joined to a pairing room' }));
        return;
      }

      const now = Date.now();
      if (now - meta.msgWindowStart > WINDOW_MS) {
        meta.msgWindowStart = now;
        meta.msgCount = 0;
      }
      meta.msgCount += 1;
      if (meta.msgCount > MAX_MSGS_PER_WINDOW) {
        ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: typeof msg.ts === 'number' ? msg.ts : now }));
        return;
      }

      // Zero-knowledge encrypted relay to counterpart device
      if (msg.type === 'relay') {
        const envelope = msg.envelope as Record<string, unknown> | undefined;
        if (
          !envelope ||
          typeof envelope.iv !== 'string' ||
          typeof envelope.ct !== 'string' ||
          !B64URL_RE.test(envelope.iv) ||
          !B64URL_RE.test(envelope.ct)
        ) {
          ws.send(JSON.stringify({ type: 'error', message: 'Malformed encrypted envelope' }));
          return;
        }

        const room = rooms.get(meta.room);
        if (!room) return;
        room.lastActivity = now;

        const targetRole: PeerRole = meta.role === 'host' ? 'client' : 'host';
        const target = room[targetRole];
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(
            JSON.stringify({
              type: 'relay',
              from: meta.role,
              sentAt: typeof msg.sentAt === 'number' ? msg.sentAt : now,
              envelope: {
                iv: envelope.iv,
                ct: envelope.ct,
              },
            })
          );
        }
      }
    });

    ws.on('close', () => detachSocket(ws));
    ws.on('error', () => detachSocket(ws));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PolSim encrypted bridge server listening on http://localhost:${PORT}`);
  });
}

startServer();
