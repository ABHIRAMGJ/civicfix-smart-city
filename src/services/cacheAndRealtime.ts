import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { Request, Response, NextFunction } from 'express';

// Redis-compatible caching & rate-limiting layer with in-memory TTL store
class CacheStore {
  private store = new Map<string, { value: any; expiresAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds = 30): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export const appCache = new CacheStore();

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function apiRateLimiter(maxRequests = 120, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'global';
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests: Rate limit exceeded. Please wait a moment.',
      });
    }
    return next();
  };
}

let wss: WebSocketServer | null = null;

export function initRealtimeServer(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket: WebSocket) => {
    socket.send(
      JSON.stringify({
        event: 'connection:established',
        timestamp: new Date().toISOString(),
      })
    );
  });

  return wss;
}

export function broadcastRealtimeEvent(event: string, payload: any) {
  if (!wss) return;
  const message = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
