// Storage providers: local filesystem (dev) + S3-compatible (MinIO/R2/S3 production).
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { IStorageProvider } from '../provider/types';
import { logger } from '../../utils/logger';

export const localStorage: IStorageProvider = {
  id: 'local',
  async put(key: string, data: Buffer, mime: string) {
    const file = path.join(config.dataDir, 'recordings', key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    try { fs.writeFileSync(file + '.mime', mime); } catch {}
    return { key, bytes: data.length };
  },
  async get(key: string) {
    const file = path.join(config.dataDir, 'recordings', key);
    if (!fs.existsSync(file)) return null;
    let mime = 'application/octet-stream';
    try { mime = fs.readFileSync(file + '.mime', 'utf8'); } catch {}
    return { data: fs.readFileSync(file), mime };
  },
  async delete(key: string) {
    try { fs.unlinkSync(path.join(config.dataDir, 'recordings', key)); } catch {}
  },
};

function s3Client() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AWS = require('aws-sdk');
  return new AWS.S3({
    endpoint: config.s3.endpoint || undefined,
    region: config.s3.region,
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
    s3ForcePathStyle: true, signatureVersion: 'v4',
  });
}

export const s3Storage: IStorageProvider = {
  id: 's3',
  async put(key: string, data: Buffer, mime: string) {
    const s3 = s3Client();
    await s3.putObject({ Bucket: config.s3.bucket, Key: key, Body: data, ContentType: mime }).promise();
    return { key, bytes: data.length };
  },
  async get(key: string) {
    try {
      const s3 = s3Client();
      const o = await s3.getObject({ Bucket: config.s3.bucket, Key: key }).promise();
      return { data: Buffer.from(o.Body as Buffer), mime: o.ContentType || 'application/octet-stream' };
    } catch { return null; }
  },
  async delete(key: string) {
    const s3 = s3Client();
    await s3.deleteObject({ Bucket: config.s3.bucket, Key: key }).promise();
  },
  async getSignedUrl(key: string, expiresSec: number) {
    const s3 = s3Client();
    return s3.getSignedUrlPromise('getObject', { Bucket: config.s3.bucket, Key: key, Expires: expiresSec });
  },
};

export function activeStorage(): IStorageProvider {
  if (config.s3.endpoint && config.s3.accessKey) return s3Storage;
  return localStorage;
}

export async function safePut(key: string, data: Buffer, mime: string) {
  try { return await activeStorage().put(key, data, mime); }
  catch (e) {
    logger.error('primary storage failed, falling back to local', { error: String(e) });
    if (activeStorage().id !== 'local') return localStorage.put(key, data, mime);
    throw e;
  }
}
