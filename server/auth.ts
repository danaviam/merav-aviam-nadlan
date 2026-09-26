import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from './db.js';

const COOKIE = 'admin_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn(
      '⚠️  JWT_SECRET is not set – using a temporary secret. Admin sessions will reset on every restart.',
    );
    return crypto.randomBytes(32).toString('hex');
  })();

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  ADMIN_PASSWORD is not set – the admin area is locked until you set it in .env');
}

export function checkPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  // השוואה בזמן קבוע כדי לא לחשוף מידע דרך זמני תגובה
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function issueSession(req: Request, res: Response) {
  const token = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

export function isAdmin(req: Request): boolean {
  const token = req.cookies?.[COOKIE];
  if (typeof token !== 'string') return false;
  try {
    const payload = jwt.verify(token, SECRET) as { role?: string };
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'יש להתחבר לאיזור הניהול' });
}

/**
 * מונה בקשות בחלון זמן. בענן הספירה נשמרת ב-Redis (כי כל בקשה יכולה לרוץ במופע אחר של השרת),
 * ומקומית בזיכרון.
 */
function counter(name: string, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function inMemory(key: string, add: number) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      if (!add) return 0;
      hits.set(key, { count: add, resetAt: now + windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
      return add;
    }
    return (entry.count += add);
  }

  async function inRedis(key: string, add: number) {
    const redisKey = `nadlan:rl:${name}:${key}`;
    if (!add) return Number((await redis!.get<number>(redisKey)) ?? 0);
    const [count] = await redis!.multi().incr(redisKey).pexpire(redisKey, windowMs, 'NX').exec<[number, number]>();
    return count;
  }

  const count = (key: string, add: number) =>
    redis ? inRedis(key, add).catch(() => inMemory(key, add)) : Promise.resolve(inMemory(key, add));
  return {
    /** מוסיף 1 ומחזיר את הספירה */
    hit: (key: string) => count(key, 1),
    /** מחזיר את הספירה בלי לשנות אותה */
    peek: (key: string) => count(key, 0),
  };
}

/** הגבלת קצב לפי IP */
export function rateLimit(name: string, max: number, windowMs: number, message: string) {
  const c = counter(name, windowMs);
  return (req: Request, res: Response, next: NextFunction) => {
    c.hit(req.ip ?? 'unknown').then((n) => (n > max ? res.status(429).json({ error: message }) : next()), next);
  };
}

/**
 * נעילת התחברות לכל האתר אחרי יותר מדי ניסיונות כושלים מכל הכתובות יחד.
 * ההגבלה לפי IP לא עוצרת תוקף שמשתמש בהרבה כתובות, וזה בדיוק המקרה שהנעילה הזו תופסת.
 */
const LOGIN_FAIL_MAX = 30;
const loginFailures = counter('login-fail-all', 60 * 60 * 1000);
export const isLoginLocked = async () => (await loginFailures.peek('all')) >= LOGIN_FAIL_MAX;
export const recordLoginFailure = () => loginFailures.hit('all');
