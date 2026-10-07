// In-process cache with TTL: short-lived session data, webhook-event dedup.
// VoxPilot runs as a single local instance, so no external cache server
// (previously Redis) is needed. API is async to stay a drop-in if a
// shared cache is ever required again.
class Cache {
  private mem = new Map<string, { v: string; exp: number }>();

  async init() {
    // No-op kept for lifecycle symmetry with db.init().
  }

  async get(key: string): Promise<string | null> {
    const e = this.mem.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) { this.mem.delete(key); return null; }
    return e.v;
  }
  async set(key: string, value: string, ttlSec = 3600): Promise<void> {
    this.mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }
  async del(key: string): Promise<void> {
    this.mem.delete(key);
  }
}

export const cache = new Cache();
export const callStateKey = (callId: string) => `callstate:${callId}`;
