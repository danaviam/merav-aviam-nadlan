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
 * הגבלת קצב לפי IP. בענן הספירה נשמרת ב-Redis (כי כל בקשה יכולה לרוץ במופע אחר של השרת),
 * ומקומית בזיכרון.
 */
export function rateLimit(name: string, max: number, windowMs: number, message: string) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  function countInMemory(key: string) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
      return 1;
    }
    return ++entry.count;
  }

  async function countInRedis(key: string) {
    const redisKey = `nadlan:rl:${name}:${key}`;
    const [count] = await redis!.multi().incr(redisKey).pexpire(redisKey, windowMs, 'NX').exec<[number, number]>();
    return count;
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const count = redis ? countInRedis(key).catch(() => countInMemory(key)) : Promise.resolve(countInMemory(key));
    count.then((n) => (n > max ? res.status(429).json({ error: message }) : next()), next);
  };
}
