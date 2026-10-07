// Socket.IO realtime layer: per-call rooms + per-user rooms.
// Events: call-status, transcript-turn, current-question, notes-updated,
// summary-ready, call-started, call-ended, ai-speaking, error.
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

let io: Server | null = null;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: { origin: [config.frontendUrl, 'http://localhost:4200', 'http://localhost:8100', 'capacitor://localhost', 'http://localhost', 'https://localhost'], credentials: true },
    path: '/socket.io',
  });
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token || '';
      if (!token) return next(new Error('missing token'));
      const p = jwt.verify(token, config.jwtSecret) as { sub: string };
      (socket.data as any).userId = p.sub;
      next();
    } catch { next(new Error('unauthorized')); }
  });
  io.on('connection', (socket) => {
    const userId = (socket.data as any).userId;
    socket.join(`user:${userId}`);
    socket.on('join-call', (callId: string) => { socket.join(`call:${callId}`); });
    socket.on('leave-call', (callId: string) => { socket.leave(`call:${callId}`); });
    // Barge-in: client signals caller started speaking → server flags AI to stop.
    socket.on('barge-in', (callId: string) => {
      io?.to(`call:${callId}`).emit('barge-in', { callId, at: new Date().toISOString() });
    });
    socket.on('disconnect', () => {});
  });
  logger.info('socket.io initialized');
  return io;
}

export function emitToCall(callId: string, event: string, payload: unknown) {
  try { io?.to(`call:${callId}`).emit(event, payload); } catch {}
}
export function emitToUser(userId: string, event: string, payload: unknown) {
  try { io?.to(`user:${userId}`).emit(event, payload); } catch {}
}
