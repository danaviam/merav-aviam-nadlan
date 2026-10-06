import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { del } from '@vercel/blob';
import type { ContactMessage, Property } from '../shared/types.js';
import { seedProperties } from './seed.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface Database {
  properties: Property[];
  messages: ContactMessage[];
}

/**
 * שני מצבי אחסון:
 * - בענן (Vercel): הנתונים ב-Upstash Redis והתמונות ב-Vercel Blob. מופעל כשמשתני הסביבה שלהם מוגדרים.
 * - מקומי: קובץ JSON ותיקיית תמונות בתוך DATA_DIR.
 */
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;
export const BLOB_UPLOADS = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

if (process.env.VERCEL && !redis) {
  console.error('⚠️  Upstash Redis is not connected – data will not be saved. Connect it in Vercel → Storage.');
}

function normalize(db: Partial<Database>): Database {
  return { properties: db.properties ?? [], messages: db.messages ?? [] };
}

/* ---------- Redis ---------- */

const KEY = 'nadlan:db';
const VERSION_KEY = 'nadlan:db:version';

// שומר רק אם אף אחד אחר לא כתב בינתיים (כדי ששתי בקשות במקביל לא ידרסו זו את זו)
const CAS_SCRIPT = `
local v = redis.call('GET', KEYS[2]) or '0'
if v ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('INCR', KEYS[2])
return 1`;

async function redisRead(r: Redis): Promise<{ db: Database; version: string }> {
  const [raw, version] = await r.mget<[Database | null, number | string | null]>(KEY, VERSION_KEY);
  if (raw) return { db: normalize(raw), version: String(version ?? 0) };
  const db = { properties: seedProperties(), messages: [] };
  await r.eval(CAS_SCRIPT, [KEY, VERSION_KEY], ['0', JSON.stringify(db)]);
  return redisRead(r);
}

async function redisUpdate<T>(r: Redis, fn: (db: Database) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { db, version } = await redisRead(r);
    const result = await fn(db);
    const ok = await r.eval(CAS_SCRIPT, [KEY, VERSION_KEY], [version, JSON.stringify(db)]);
    if (ok === 1) return result;
    await new Promise((res) => setTimeout(res, 30 + Math.random() * 120));
  }
  throw new Error('Database is busy, please retry');
}

/* ---------- קובץ מקומי ---------- */

let cache: Database | null = null;
// כל הכתיבות עוברות בתור אחד כדי ששתי בקשות במקביל לא ידרסו זו את זו
let queue: Promise<unknown> = Promise.resolve();

async function fileInit(): Promise<Database> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    return normalize(JSON.parse(await fs.readFile(DB_FILE, 'utf8')));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    const db = { properties: seedProperties(), messages: [] };
    await persist(db);
    console.log('Created a new database with sample properties at', DB_FILE);
    return db;
  }
}

async function persist(db: Database) {
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_FILE);
}

/* ---------- ממשק משותף ---------- */

export async function readDb(): Promise<Database> {
  if (redis) return (await redisRead(redis)).db;
  cache ??= await fileInit();
  return cache;
}

export function updateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  if (redis) return redisUpdate(redis, fn);
  const run = queue.then(async () => {
    const db = await readDb();
    // עובדים על עותק כדי שכשל באמצע לא ישאיר נתונים חצי-מעודכנים בזיכרון
    const draft: Database = structuredClone(db);
    const result = await fn(draft);
    await persist(draft);
    cache = draft;
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** כתובת של תמונה שהועלתה דרך האתר (ולא קישור חיצוני) */
export const isBlobUrl = (url: string) => /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);
export const isLocalUpload = (url: string) => /^\/uploads\/[\w-]+\.(jpg|png|webp|avif)$/.test(url);

/** מוחק תמונה שהועלתה (מתעלם מכתובות חיצוניות) */
export async function removeUpload(url: string) {
  if (isBlobUrl(url)) {
    if (BLOB_UPLOADS) await del(url).catch((err) => console.error('Failed to delete blob', url, err));
    return;
  }
  if (!url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  await fs.unlink(file).catch(() => undefined);
}
