// Unified data-access layer: MongoDB when MONGODB_URI connects, else file-backed memory store.
// Services must ONLY use this repository (never mongoose/memory directly).
import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';
import { registerModels } from './schemas';
import { MemoryStore } from './memory';
import { CollectionName } from './types';

type Doc = Record<string, any>;
const MODEL_BY_COLLECTION: Record<CollectionName, string> = {
  users: 'User', agents: 'Agent', scripts: 'Script', providers: 'AiProvider',
  calls: 'CallSession', turns: 'CallTurn', clips: 'RecordingClip', notes: 'Note',
  summaries: 'CallSummary', webhooks: 'Webhook', audit_logs: 'AuditLog', settings: 'UserSettings',
};

function toPlain(d: any): Doc {
  const o = d?.toObject ? d.toObject() : { ...d };
  if (o._id && typeof o._id !== 'string') o._id = String(o._id);
  return o;
}

class Repository {
  private mem = new MemoryStore(config.dataDir);
  private models: Record<string, mongoose.Model<any>> | null = null;
  private mongoReady = false;

  async init(): Promise<void> {
    if (!config.mongoUri) {
      logger.info('MONGODB_URI not set — using file-backed memory store (dev/sandbox mode)');
      return;
    }
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 4000 });
      this.models = registerModels();
      this.mongoReady = true;
      logger.info('connected to MongoDB');
    } catch (e) {
      logger.warn('MongoDB unreachable — falling back to memory store', { error: String(e) });
      this.models = null; this.mongoReady = false;
    }
  }

  get backend(): 'mongo' | 'memory' { return this.mongoReady ? 'mongo' : 'memory'; }

  async flush(): Promise<void> { this.mem.flush(); }

  private model(col: CollectionName) {
    if (!this.models) throw new Error('mongo not ready');
    return this.models[MODEL_BY_COLLECTION[col]];
  }

  async create<T = Doc>(col: CollectionName, doc: Doc): Promise<T> {
    if (this.mongoReady) return toPlain(await this.model(col).create(doc)) as T;
    return (await this.mem.create(col, doc)) as T;
  }
  async find<T = Doc>(col: CollectionName, filter: Record<string, any> = {}, opts: { sort?: string; dir?: 1 | -1; limit?: number; skip?: number } = {}): Promise<T[]> {
    if (this.mongoReady) {
      let q = this.model(col).find(filter).lean();
      if (opts.sort) q = q.sort({ [opts.sort]: opts.dir ?? 1 } as any);
      if (opts.skip) q = q.skip(opts.skip);
      if (opts.limit) q = q.limit(opts.limit);
      return (await q).map(r => { const o = { ...r } as Doc; if (o._id) o._id = String(o._id); return o; }) as T[];
    }
    return (await this.mem.find(col, filter, opts)) as T[];
  }
  async findOne<T = Doc>(col: CollectionName, filter: Record<string, any> = {}): Promise<T | null> {
    if (this.mongoReady) {
      const r = await this.model(col).findOne(filter).lean();
      if (!r) return null;
      const o = { ...r } as Doc; if (o._id) o._id = String(o._id);
      return o as T;
    }
    return (await this.mem.findOne(col, filter)) as T | null;
  }
  async updateOne<T = Doc>(col: CollectionName, filter: Record<string, any>, patch: Record<string, any>): Promise<T | null> {
    if (this.mongoReady) {
      const r = await this.model(col).findOneAndUpdate(filter, { $set: patch }, { new: true }).lean();
      if (!r) return null;
      const o = { ...r } as Doc; if (o._id) o._id = String(o._id);
      return o as T;
    }
    return (await this.mem.updateOne(col, filter, patch)) as T | null;
  }
  async deleteOne(col: CollectionName, filter: Record<string, any>): Promise<boolean> {
    if (this.mongoReady) return (await this.model(col).deleteOne(filter)).deletedCount > 0;
    return this.mem.deleteOne(col, filter);
  }
  async deleteMany(col: CollectionName, filter: Record<string, any>): Promise<number> {
    if (this.mongoReady) return (await this.model(col).deleteMany(filter)).deletedCount;
    return this.mem.deleteMany(col, filter);
  }
  async count(col: CollectionName, filter: Record<string, any> = {}): Promise<number> {
    if (this.mongoReady) return this.model(col).countDocuments(filter);
    return this.mem.count(col, filter);
  }
}

export const db = new Repository();
