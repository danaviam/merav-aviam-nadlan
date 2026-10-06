import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
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
 * - בענן (Vercel): הנתונים בטבלת kv ב-Supabase והתמונות ב-Supabase Storage. מופעל כשמשתני הסביבה שלהם מוגדרים.
 * - מקומי: קובץ JSON ותיקיית תמונות בתוך DATA_DIR.
 */
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } }) : null;
export const CLOUD_UPLOADS = Boolean(supabase);
export const BUCKET = 'uploads';
export const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_PUBLIC_URL = SUPABASE_URL ?? '';

if (process.env.VERCEL && !supabase) {
  console.error('⚠️  Supabase is not connected – data will not be saved. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

function normalize(db: Partial<Database>): Database {
  return { properties: db.properties ?? [], messages: db.messages ?? [] };
}

/* ---------- Supabase ---------- */

const KEY = 'nadlan:db';

async function cloudRead(c: NonNullable<typeof supabase>): Promise<{ db: Database; version: number }> {
  const { data, error } = await c.from('kv').select('value, version').eq('key', KEY).maybeSingle();
  if (error) throw error;
  if (data) return { db: normalize(data.value as Database), version: Number(data.version) };
  const db = { properties: seedProperties(), messages: [] };
  // התעלמות מכפילות: אם בקשה אחרת כבר יצרה את הרשומה, קוראים אותה מחדש
  const { error: insertError } = await c
    .from('kv')
    .upsert({ key: KEY, value: db, version: 0 }, { onConflict: 'key', ignoreDuplicates: true });
  if (insertError) throw insertError;
  return cloudRead(c);
}

async function cloudUpdate<T>(c: NonNullable<typeof supabase>, fn: (db: Database) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { db, version } = await cloudRead(c);
    const result = await fn(db);
    // שומר רק אם אף אחד אחר לא כתב בינתיים (כדי ששתי בקשות במקביל לא ידרסו זו את זו)
    const { data, error } = await c
      .from('kv')
      .update({ value: db, version: version + 1 })
      .eq('key', KEY)
      .eq('version', version)
      .select('version');
    if (error) throw error;
    if (data.length) return result;
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
  if (supabase) return (await cloudRead(supabase)).db;
  cache ??= await fileInit();
  return cache;
}

export function updateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  if (supabase) return cloudUpdate(supabase, fn);
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
const PUBLIC_PREFIX = `${SUPABASE_URL ?? 'https://invalid.invalid'}/storage/v1/object/public/${BUCKET}/`;
export const isCloudUpload = (url: string) => url.startsWith(PUBLIC_PREFIX);
export const isLocalUpload = (url: string) => /^\/uploads\/[\w-]+\.(jpg|png|webp|avif)$/.test(url);
export const cloudUploadUrl = (path: string) => PUBLIC_PREFIX + path;

/** מוחק תמונה שהועלתה (מתעלם מכתובות חיצוניות) */
export async function removeUpload(url: string) {
  if (isCloudUpload(url)) {
    if (supabase) {
      const { error } = await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(PUBLIC_PREFIX.length))]);
      if (error) console.error('Failed to delete image', url, error);
    }
    return;
  }
  if (!url.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(url));
  await fs.unlink(file).catch(() => undefined);
}
