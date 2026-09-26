/**
 * העברה חד-פעמית של הנתונים המקומיים (data/db.json + data/uploads) לענן:
 * התמונות עולות ל-Vercel Blob והנכסים והפניות נשמרים ב-Upstash Redis.
 *
 * לפני ההרצה:  npx vercel env pull .env.local   (מוריד את מפתחות הענן מהפרויקט ב-Vercel)
 * הרצה:        npm run migrate
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const { put } = await import('@vercel/blob');
const { redis, BLOB_UPLOADS, DATA_DIR, UPLOAD_DIR, updateDb } = await import('../server/db.js');

if (!redis || !BLOB_UPLOADS) {
  console.error('חסרים מפתחות של Upstash Redis או Vercel Blob ב-.env.local. הריצו קודם: npx vercel env pull .env.local');
  process.exit(1);
}

const local = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'db.json'), 'utf8'));
const moved = new Map<string, string>();

for (const p of local.properties ?? []) {
  const images: string[] = [];
  for (const url of p.images as string[]) {
    if (!url.startsWith('/uploads/')) {
      images.push(url);
      continue;
    }
    if (!moved.has(url)) {
      const name = path.basename(url);
      const file = await fs.readFile(path.join(UPLOAD_DIR, name)).catch(() => null);
      if (!file) {
        console.warn(`התמונה ${url} לא נמצאה, מדלגים`);
        continue;
      }
      const blob = await put(`properties/${name}`, file, { access: 'public', addRandomSuffix: true });
      moved.set(url, blob.url);
      console.log(`הועלתה ${name}`);
    }
    images.push(moved.get(url)!);
  }
  p.images = images;
}

await updateDb((db) => {
  db.properties = local.properties ?? [];
  db.messages = local.messages ?? [];
});
console.log(`הסתיים: ${local.properties?.length ?? 0} נכסים, ${local.messages?.length ?? 0} פניות, ${moved.size} תמונות.`);
