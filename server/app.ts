import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import type { ContactMessage, Property } from '../shared/types.js';
import {
  checkPassword,
  clearSession,
  isAdmin,
  isLoginLocked,
  issueSession,
  rateLimit,
  recordLoginFailure,
  requireAdmin,
} from './auth.js';
import {
  BUCKET,
  CLOUD_UPLOADS,
  cloudUploadUrl,
  isCloudUpload,
  isLocalUpload,
  readDb,
  removeUpload,
  supabase,
  SUPABASE_PUBLIC_KEY,
  updateDb,
  UPLOAD_DIR,
} from './db.js';
import { HttpError } from './errors.js';
import { notifyNewMessage } from './mailer.js';
import { seo } from './seo.js';
import { parseContactInput, parsePropertyInput } from './validate.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// תקרה כללית לכל כתובת IP, מעבר להגבלות הספציפיות להתחברות ולטופס. גולש רגיל לא מתקרב אליה
app.use('/api', rateLimit('api', 300, 5 * 60 * 1000, 'יותר מדי בקשות. נסו שוב בעוד כמה דקות.'));

/**
 * תשובות ציבוריות נשמרות ב-CDN של Vercel לחצי דקה, כך שעומס של גולשים (או התקפה) על דף הבית
 * לא מגיע בכלל לשרת ולמסד הנתונים. נכס שעודכן יופיע באתר תוך חצי דקה לכל היותר.
 */
const publicCache = (res: Response) =>
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');

// Express 4 לא תופס שגיאות של פונקציות async בעצמו
const ah =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/* ---------- העלאת תמונות ---------- */

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

// מקומי: הדפדפן שולח קובץ אחד בכל בקשה והוא נשמר בתיקיית uploads
const upload = multer({
  storage: multer.diskStorage({
    // פונקציה ולא נתיב קבוע: multer יוצר נתיב קבוע כבר בטעינה, וב-Vercel מערכת הקבצים לקריאה בלבד
    destination: (_req, _file, cb) =>
      fs.mkdir(UPLOAD_DIR, { recursive: true }).then(() => cb(null, UPLOAD_DIR), (err) => cb(err, '')),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + (MIME_EXT[file.mimetype] ?? '')),
  }),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'אפשר להעלות רק תמונות JPG, PNG, WEBP או AVIF'));
  },
});

let bucketReady: Promise<unknown> | null = null;
const ensureBucket = () =>
  (bucketReady ??= supabase!.storage
    .createBucket(BUCKET, { public: true, fileSizeLimit: MAX_IMAGE_BYTES, allowedMimeTypes: Object.keys(MIME_EXT) })
    .then(({ error }) => {
      // "already exists" הוא המצב הרגיל
      if (error && !/exist/i.test(error.message)) throw error;
    })
    .catch((err) => {
      bucketReady = null;
      throw err;
    }));

/**
 * בענן: הדפדפן מעלה את התמונה ישירות ל-Supabase Storage (עוקף את מגבלת 4.5MB לבקשה ב-Vercel),
 * והשרת רק מנפיק כתובת העלאה חתומה אחרי שבדק שהמשתמש מחובר.
 */
app.post(
  '/api/admin/upload',
  requireAdmin,
  (req, res, next) => (CLOUD_UPLOADS ? next() : upload.single('file')(req, res, next)),
  ah(async (req, res) => {
    if (!CLOUD_UPLOADS) {
      if (!req.file) throw new HttpError(400, 'לא התקבלה תמונה');
      return void res.status(201).json({ url: `/uploads/${req.file.filename}` });
    }
    const ext = MIME_EXT[String(req.body?.contentType)];
    if (!ext) throw new HttpError(400, 'אפשר להעלות רק תמונות JPG, PNG, WEBP או AVIF');
    await ensureBucket();
    const path = `properties/${crypto.randomUUID()}${ext}`;
    const { data, error } = await supabase!.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    res.json({ uploadUrl: data.signedUrl, url: cloudUploadUrl(path) });
  }),
);

const isExternalImage = (url: string) => /^https:\/\/\S+$/i.test(url);
const isNewImage = (url: string) => isCloudUpload(url) || isLocalUpload(url) || isExternalImage(url);

/* ---------- API ציבורי ---------- */

const sortProperties = (list: Property[]) =>
  [...list].sort(
    (a, b) =>
      Number(a.status === 'sold') - Number(b.status === 'sold') ||
      Number(b.featured) - Number(a.featured) ||
      b.createdAt.localeCompare(a.createdAt),
  );

app.get(
  '/api/properties',
  ah(async (_req, res) => {
    const db = await readDb();
    publicCache(res);
    res.json(sortProperties(db.properties.filter((p) => p.status !== 'hidden')));
  }),
);

app.get(
  '/api/properties/:id',
  ah(async (req, res) => {
    const db = await readDb();
    const p = db.properties.find((x) => x.id === req.params.id);
    if (!p || (p.status === 'hidden' && !isAdmin(req))) throw new HttpError(404, 'הנכס לא נמצא');
    // טיוטה שמוצגת למנהלת בלבד לא נשמרת במטמון המשותף
    if (p.status === 'hidden') res.setHeader('Cache-Control', 'private, no-store');
    else publicCache(res);
    res.json(p);
  }),
);

app.post(
  '/api/contact',
  rateLimit('contact', 6, 10 * 60 * 1000, 'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.'),
  ah(async (req, res) => {
    const input = parseContactInput(req.body);
    // בוט מילא את שדה המלכודת – עונים "הצלחה" בלי לשמור
    if (input.website) return void res.json({ ok: true });

    const db = await readDb();
    const property = input.propertyId ? db.properties.find((p) => p.id === input.propertyId) : undefined;
    const msg: ContactMessage = {
      id: crypto.randomUUID(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      propertyId: property?.id ?? null,
      propertyTitle: property?.title ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await updateDb((d) => {
      d.messages.unshift(msg);
      d.messages = d.messages.slice(0, 2000);
    });
    // מחכים לשליחה: בשרת ללא-שרת (Vercel) הפונקציה נעצרת מיד אחרי התשובה
    await notifyNewMessage(msg);
    res.status(201).json({ ok: true });
  }),
);

/* ---------- התחברות ---------- */

app.post(
  '/api/admin/login',
  rateLimit('login', 8, 15 * 60 * 1000, 'יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות.'),
  ah(async (req, res) => {
    if (await isLoginLocked()) {
      throw new HttpError(429, 'ההתחברות נחסמה זמנית בגלל ניסיונות חוזרים. נסו שוב בעוד שעה.');
    }
    if (!checkPassword(req.body?.password)) {
      await recordLoginFailure();
      return void res.status(401).json({ error: 'הסיסמה שגויה' });
    }
    issueSession(req, res);
    res.json({ admin: true });
  }),
);

app.post('/api/admin/logout', (_req, res) => {
  clearSession(res);
  res.json({ admin: false });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ admin: isAdmin(req), cloudUploads: CLOUD_UPLOADS, uploadKey: CLOUD_UPLOADS ? SUPABASE_PUBLIC_KEY : undefined });
});

/* ---------- ניהול נכסים (מוגן) ---------- */

app.get(
  '/api/admin/properties',
  requireAdmin,
  ah(async (_req, res) => {
    const db = await readDb();
    res.json([...db.properties].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }),
);

app.post(
  '/api/admin/properties',
  requireAdmin,
  ah(async (req, res) => {
    const input = parsePropertyInput(req.body);
    const now = new Date().toISOString();
    const property: Property = {
      ...input,
      images: [...new Set(input.images.filter(isNewImage))],
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await updateDb((db) => {
      db.properties.push(property);
    });
    res.status(201).json(property);
  }),
);

app.put(
  '/api/admin/properties/:id',
  requireAdmin,
  ah(async (req, res) => {
    const input = parsePropertyInput(req.body);
    const { updated, removed } = await updateDb((db) => {
      const idx = db.properties.findIndex((p) => p.id === req.params.id);
      if (idx < 0) throw new HttpError(404, 'הנכס לא נמצא');
      const prev = db.properties[idx];
      const images = [...new Set(input.images.filter((u) => prev.images.includes(u) || isNewImage(u)))];
      const updated: Property = { ...prev, ...input, images, updatedAt: new Date().toISOString() };
      db.properties[idx] = updated;
      return { updated, removed: prev.images.filter((u) => !images.includes(u)) };
    });
    await Promise.all(removed.map(removeUpload));
    res.json(updated);
  }),
);

/** עדכון מהיר של סטטוס / נכס מומלץ בלי לשלוח את כל הטופס */
app.patch(
  '/api/admin/properties/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { status, featured } = req.body ?? {};
    const updated = await updateDb((db) => {
      const p = db.properties.find((x) => x.id === req.params.id);
      if (!p) throw new HttpError(404, 'הנכס לא נמצא');
      if (status === 'active' || status === 'sold' || status === 'hidden') p.status = status;
      if (typeof featured === 'boolean') p.featured = featured;
      p.updatedAt = new Date().toISOString();
      return p;
    });
    res.json(updated);
  }),
);

app.delete(
  '/api/admin/properties/:id',
  requireAdmin,
  ah(async (req, res) => {
    const removed = await updateDb((db) => {
      const idx = db.properties.findIndex((p) => p.id === req.params.id);
      if (idx < 0) throw new HttpError(404, 'הנכס לא נמצא');
      const [p] = db.properties.splice(idx, 1);
      return p;
    });
    await Promise.all(removed.images.map(removeUpload));
    res.json({ ok: true });
  }),
);

/* ---------- פניות (מוגן) ---------- */

app.get(
  '/api/admin/messages',
  requireAdmin,
  ah(async (_req, res) => {
    res.json((await readDb()).messages);
  }),
);

app.patch(
  '/api/admin/messages/:id',
  requireAdmin,
  ah(async (req, res) => {
    const msg = await updateDb((db) => {
      const m = db.messages.find((x) => x.id === req.params.id);
      if (!m) throw new HttpError(404, 'הפנייה לא נמצאה');
      m.read = req.body?.read !== false;
      return m;
    });
    res.json(msg);
  }),
);

app.delete(
  '/api/admin/messages/:id',
  requireAdmin,
  ah(async (req, res) => {
    await updateDb((db) => {
      db.messages = db.messages.filter((m) => m.id !== req.params.id);
    });
    res.json({ ok: true });
  }),
);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'לא נמצא' });
});

/* ---------- עמודי האתר, sitemap.xml ו-robots.txt (ראו server/seo.ts) ---------- */

app.use(seo);

/* ---------- טיפול בשגיאות ---------- */

app.use(function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'כל תמונה יכולה להיות עד 10MB' : 'העלאת התמונה נכשלה';
    return void res.status(400).json({ error: message });
  }
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת. נסו שוב.' });
});
