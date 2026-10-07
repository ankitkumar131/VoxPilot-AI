// File-backed in-memory store: zero-dependency local dev & sandbox runtime.
// Persists to ./data/db.json. Production uses MongoDB via repository switch.
import fs from 'fs';
import path from 'path';
import { CollectionName } from './types';
import { logger } from '../utils/logger';

type Doc = Record<string, any>;
type DB = Record<CollectionName, Doc[]>;

const COLLECTIONS: CollectionName[] = ['users','agents','scripts','providers','calls','turns','clips','notes','summaries','webhooks','audit_logs','settings'];

function emptyDb(): DB {
  return Object.fromEntries(COLLECTIONS.map(c => [c, []])) as unknown as DB;
}

export class MemoryStore {
  private db: DB = emptyDb();
  private file: string;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'db.json');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.db = { ...emptyDb(), ...raw };
      }
    } catch (e) {
      logger.warn('memory store init failed, using ephemeral store', { error: String(e) });
    }
  }

  flush() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    try { fs.writeFileSync(this.file, JSON.stringify(this.db)); } catch {}
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try { fs.writeFileSync(this.file, JSON.stringify(this.db)); }
      catch (e) { logger.warn('memory store save failed', { error: String(e) }); }
    }, 250);
  }

  private match(doc: Doc, filter: Record<string, any>): boolean {
    for (const [k, v] of Object.entries(filter)) {
      if (v && typeof v === 'object' && ('$in' in v || '$regex' in v || '$ne' in v)) {
        if ('$in' in v && !(v as any).$in.includes(doc[k])) return false;
        if ('$ne' in v && doc[k] === (v as any).$ne) return false;
        if ('$regex' in v && !new RegExp((v as any).$regex, (v as any).$options || 'i').test(String(doc[k] ?? ''))) return false;
      } else if (doc[k] !== v) return false;
    }
    return true;
  }

  async create(col: CollectionName, doc: Doc): Promise<Doc> {
    this.db[col].push(doc); this.scheduleSave(); return { ...doc };
  }
  async find(col: CollectionName, filter: Record<string, any> = {}, opts: { sort?: string; dir?: 1 | -1; limit?: number; skip?: number } = {}): Promise<Doc[]> {
    let rows = this.db[col].filter(d => this.match(d, filter));
    if (opts.sort) rows = [...rows].sort((a, b) => {
      const av = a[opts.sort!]; const bv = b[opts.sort!];
      if (av === bv) return 0; return (av > bv ? 1 : -1) * (opts.dir ?? 1);
    });
    if (opts.skip) rows = rows.slice(opts.skip);
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return rows.map(r => ({ ...r }));
  }
  async findOne(col: CollectionName, filter: Record<string, any> = {}): Promise<Doc | null> {
    const r = this.db[col].find(d => this.match(d, filter));
    return r ? { ...r } : null;
  }
  async updateOne(col: CollectionName, filter: Record<string, any>, patch: Record<string, any>): Promise<Doc | null> {
    const i = this.db[col].findIndex(d => this.match(d, filter));
    if (i < 0) return null;
    this.db[col][i] = { ...this.db[col][i], ...patch };
    this.scheduleSave();
    return { ...this.db[col][i] };
  }
  async deleteOne(col: CollectionName, filter: Record<string, any>): Promise<boolean> {
    const i = this.db[col].findIndex(d => this.match(d, filter));
    if (i < 0) return false;
    this.db[col].splice(i, 1); this.scheduleSave(); return true;
  }
  async deleteMany(col: CollectionName, filter: Record<string, any>): Promise<number> {
    const before = this.db[col].length;
    this.db[col] = this.db[col].filter(d => !this.match(d, filter));
    this.scheduleSave(); return before - this.db[col].length;
  }
  async count(col: CollectionName, filter: Record<string, any> = {}): Promise<number> {
    return this.db[col].filter(d => this.match(d, filter)).length;
  }
}
