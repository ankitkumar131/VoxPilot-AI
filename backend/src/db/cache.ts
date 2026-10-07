// Cache/session layer: Redis when REDIS_URL is set, else in-process Map with TTL.
import { config } from '../config';
import { logger } from '../utils/logger';

class Cache {
  private mem = new Map<string, { v: string; exp: number }>();
  private redis: any = null;

  async init() {
    if (!config.redisUrl) { logger.info('REDIS_URL not set — using in-process cache'); return; }
    try {
      const { default: Redis } = await import('ioredis');
      this.redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
      await this.redis.connect();
      logger.info('connected to Redis');
    } catch (e) {
      logger.warn('Redis unreachable — using in-process cache', { error: String(e) });
      this.redis = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.redis) return this.redis.get(key);
    const e = this.mem.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) { this.mem.delete(key); return null; }
    return e.v;
  }
  async set(key: string, value: string, ttlSec = 3600): Promise<void> {
    if (this.redis) { await this.redis.set(key, value, 'EX', ttlSec); return; }
    this.mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }
  async del(key: string): Promise<void> {
    if (this.redis) { await this.redis.del(key); return; }
    this.mem.delete(key);
  }
}

export const cache = new Cache();
export const callStateKey = (callId: string) => `callstate:${callId}`;
